import { pool } from '../db/connection.js';
import { Message, Conversation } from '../types/index.js';
import { getIo } from '../socket.js';

export class ConversationService {
  async getOrCreateConversation(userId1: string, userId2: string, options?: { isEncrypted?: boolean, selfDestructTimer?: number }): Promise<string> {
    const isEncrypted = options?.isEncrypted || false;

    // Check if conversation exists
    let query = `
       SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       LEFT JOIN encrypted_cords ec ON c.id = ec.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2
    `;

    if (isEncrypted) {
        query += ` AND ec.id IS NOT NULL`;
    } else {
        query += ` AND ec.id IS NULL`;
    }

    const existing = await pool.query(query, [userId1, userId2]);

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Create new conversation
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const convResult = await client.query(
            'INSERT INTO conversations DEFAULT VALUES RETURNING id'
        );
        const conversationId = convResult.rows[0].id;

        await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, unread_count)
             VALUES ($1, $2, 0), ($1, $3, 0)`,
            [conversationId, userId1, userId2]
        );

        if (isEncrypted) {
            await client.query(
                `INSERT INTO encrypted_cords (conversation_id, self_destruct_timer) VALUES ($1, $2)`,
                [conversationId, options?.selfDestructTimer || 3600]
            );
        }

        await client.query('COMMIT');
        return conversationId;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string
  ): Promise<Message> {
    // Check if conversation is encrypted
    const cordResult = await pool.query(
      'SELECT is_active FROM encrypted_cords WHERE conversation_id = $1',
      [conversationId]
    );
    const isEncrypted = cordResult.rows.length > 0;

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text, is_encrypted)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, senderId, text, isEncrypted]
    );

    // Update conversation timestamp
    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Increment unread count for other participants
    await pool.query(
      `UPDATE conversation_participants
       SET unread_count = unread_count + 1
       WHERE conversation_id = $1 AND user_id != $2`,
      [conversationId, senderId]
    );

    const message = this.mapMessageFromDb(result.rows[0]);

    // Emit real-time message
    try {
        const io = getIo();
        
        // Get participants
        const participantsResult = await pool.query(
            'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
            [conversationId]
        );
        
        // Get sender username
        const senderResult = await pool.query('SELECT username FROM users WHERE id = $1', [senderId]);
        const senderUsername = senderResult.rows[0]?.username || 'Unknown';

        const payload = {
            ...message,
            senderUsername,
            conversationId
        };

        participantsResult.rows.forEach(row => {
            io.to(row.user_id).emit('new_message', payload);
        });
    } catch (error) {
        console.error('Failed to emit message:', error);
    }

    return message;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const result = await pool.query(
      `SELECT c.id, c.updated_at,
              json_agg(DISTINCT jsonb_build_object('id', u.id, 'username', u.username)) as participants,
              COALESCE(
                (SELECT json_agg(m.* ORDER BY m.created_at DESC)
                 FROM messages m
                 WHERE m.conversation_id = c.id
                 AND (m.delete_at IS NULL OR m.delete_at > CURRENT_TIMESTAMP)
                 LIMIT 50),
                '[]'::json
              ) as messages,
              (SELECT unread_count FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1) as unread_count,
              (SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END FROM encrypted_cords ec WHERE ec.conversation_id = c.id) as is_encrypted,
              (SELECT self_destruct_timer FROM encrypted_cords ec WHERE ec.conversation_id = c.id) as self_destruct_timer
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       JOIN users u ON cp.user_id = u.id
       WHERE c.id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = $1)
       GROUP BY c.id, c.updated_at
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => {
      const participants = typeof row.participants === 'string' ? JSON.parse(row.participants) : row.participants;
      const messages = typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages;
      
      return {
        id: row.id,
        participants: participants.map((p: any) => p.username),
        messages: messages.map((m: any) => this.mapMessageFromDb(m)),
        lastMessageTimestamp: row.updated_at,
        unreadCount: { [userId]: row.unread_count || 0 },
        isEncrypted: row.is_encrypted,
        selfDestructTimer: row.self_destruct_timer
      };
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    // Trigger self-destruct for encrypted messages
    const cordResult = await pool.query(
        'SELECT self_destruct_timer FROM encrypted_cords WHERE conversation_id = $1',
        [conversationId]
    );
    
    if (cordResult.rows.length > 0) {
        const timer = cordResult.rows[0].self_destruct_timer || 60;
        await pool.query(
            `UPDATE messages 
             SET delete_at = CURRENT_TIMESTAMP + ($2 || ' seconds')::interval
             WHERE conversation_id = $1 AND delete_at IS NULL AND is_encrypted = TRUE`,
            [conversationId, timer]
        );
    }

    await pool.query(
      `UPDATE conversation_participants
       SET unread_count = 0, last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
  }

  mapMessageFromDb(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.text,
      createdAt: row.created_at,
    };
  }
}

