import { pool } from '../db/connection.js';
import { Message, Conversation } from '../types/index.js';
import { getIo } from '../socket.js';

export class ConversationService {
  async getOrCreateConversation(userId1: string, userId2: string, options?: { isEncrypted?: boolean, selfDestructTimer?: number }): Promise<string> {
    if (userId1 === userId2) {
      throw new Error('Cannot create a conversation with yourself');
    }

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
    text: string,
    media?: { imageUrl?: string, videoUrl?: string, metadata?: any }
  ): Promise<Message> {
    // Check if user is a participant
    const participantCheck = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, senderId]
    );

    if (participantCheck.rows.length === 0) {
        throw new Error('User is not a participant in this conversation');
    }

    // Check if conversation is encrypted
    const cordResult = await pool.query(
      'SELECT is_active FROM encrypted_cords WHERE conversation_id = $1',
      [conversationId]
    );
    const isEncrypted = cordResult.rows.length > 0;

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text, is_encrypted, image_url, video_url, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        conversationId, 
        senderId, 
        text, 
        isEncrypted, 
        media?.imageUrl || null, 
        media?.videoUrl || null, 
        media?.metadata ? JSON.stringify(media.metadata) : '{}',
        'sent'
      ]
    );

    const message = this.mapMessageFromDb(result.rows[0]);

    // Track status per participant
    const participantsResult = await pool.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
    );

    for (const row of participantsResult.rows) {
        await pool.query(
            'INSERT INTO message_status (message_id, user_id, status) VALUES ($1, $2, $3)',
            [message.id, row.user_id, row.user_id === senderId ? 'read' : 'sent']
        );
    }

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

    // Emit real-time message
    try {
        const io = getIo();
        
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

  async updateMessageStatus(messageId: string, userId: string, status: 'delivered' | 'read'): Promise<void> {
      // Verify user is a participant in the conversation of this message
      const authCheck = await pool.query(
          `SELECT 1 FROM messages m
           JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
           WHERE m.id = $1 AND cp.user_id = $2`,
          [messageId, userId]
      );

      if (authCheck.rows.length === 0) {
          throw new Error('Unauthorized to update this message status');
      }

      await pool.query(
          `UPDATE message_status SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE message_id = $2 AND user_id = $3`,
          [status, messageId, userId]
      );

      // If all participants (except sender) have read it, update the main message status
      const msgResult = await pool.query('SELECT conversation_id, sender_id FROM messages WHERE id = $1', [messageId]);
      if (msgResult.rows.length > 0) {
          const { conversation_id, sender_id } = msgResult.rows[0];
          
          const pending = await pool.query(
              'SELECT COUNT(*) FROM message_status WHERE message_id = $1 AND user_id != $2 AND status != $3',
              [messageId, sender_id, status]
          );

          if (parseInt(pending.rows[0].count) === 0) {
              await pool.query('UPDATE messages SET status = $1 WHERE id = $2', [status, messageId]);
              
              // Emit status update to sender
              try {
                  const io = getIo();
                  io.to(sender_id).emit('message_status_update', { messageId, status, conversationId: conversation_id });
              } catch (e) {}
          }
      }
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
      const participants = (typeof row.participants === 'string' ? JSON.parse(row.participants) : row.participants) || [];
      const messages = (typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages) || [];
      
      return {
        id: row.id,
        participants: participants.filter((p: any) => p && p.username).map((p: any) => p.username),
        messages: messages.filter((m: any) => m !== null).map((m: any) => this.mapMessageFromDb(m)),
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

    // Also mark all messages as read for this user in this conversation
    const unreadMessages = await pool.query(
        `SELECT m.id FROM messages m
         JOIN message_status ms ON m.id = ms.message_id
         WHERE m.conversation_id = $1 AND ms.user_id = $2 AND ms.status != 'read'`,
        [conversationId, userId]
    );

    for (const msg of unreadMessages.rows) {
        await this.updateMessageStatus(msg.id, userId, 'read');
    }
  }

  mapMessageFromDb(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.text,
      imageUrl: row.image_url,
      videoUrl: row.video_url,
      metadata: row.metadata,
      status: row.status,
      isEncrypted: row.is_encrypted,
      createdAt: row.created_at,
    };
  }
}

