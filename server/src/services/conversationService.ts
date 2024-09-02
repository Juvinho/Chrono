import { pool } from '../db/connection.js';
import { Message, Conversation } from '../types/index.js';
import { getIo } from '../socket.js';

export class ConversationService {
  async getOrCreateConversation(userId1: string, userId2: string): Promise<string> {
    // Check if conversation exists
    const existing = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
      [userId1, userId2]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Create new conversation
    const convResult = await pool.query(
      'INSERT INTO conversations DEFAULT VALUES RETURNING id'
    );
    const conversationId = convResult.rows[0].id;

    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, unread_count)
       VALUES ($1, $2, 0), ($1, $3, 0)`,
      [conversationId, userId1, userId2]
    );

    return conversationId;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string
  ): Promise<Message> {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, text]
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
                 LIMIT 50),
                '[]'::json
              ) as messages,
              (SELECT unread_count FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1) as unread_count
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       JOIN users u ON cp.user_id = u.id
       WHERE c.id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = $1)
       GROUP BY c.id, c.updated_at
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => {
      const participants = JSON.parse(row.participants);
      const messages = JSON.parse(row.messages);
      const unreadCount: { [key: string]: number } = {};

      // Get unread counts for each participant
      const unreadResult = pool.query(
        'SELECT user_id, unread_count FROM conversation_participants WHERE conversation_id = $1',
        [row.id]
      );

      return {
        id: row.id,
        participants: participants.map((p: any) => p.username),
        messages: messages.map((m: any) => this.mapMessageFromDb(m)),
        lastMessageTimestamp: row.updated_at,
        unreadCount: { [userId]: row.unread_count || 0 },
      };
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
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

