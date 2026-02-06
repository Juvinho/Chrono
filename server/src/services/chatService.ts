import { pool } from '../db/connection.js';

export class ChatService {
  async getConversation(user1Id: string, user2Id: string) {
    const [first, second] = [user1Id, user2Id].sort();
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2',
      [first, second]
    );
    return result.rows[0];
  }

  async createConversation(user1Id: string, user2Id: string) {
    const [first, second] = [user1Id, user2Id].sort();
    const result = await pool.query(
      'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
      [first, second]
    );
    return result.rows[0];
  }

  async getUserConversations(userId: string) {
    const result = await pool.query(
      `SELECT c.*, 
        CASE 
          WHEN c.user1_id = $1 THEN u2.username 
          ELSE u1.username 
        END as other_username,
        CASE 
          WHEN c.user1_id = $1 THEN u2.avatar 
          ELSE u1.avatar 
        END as other_avatar,
        CASE 
          WHEN c.user1_id = $1 THEN u2.id 
          ELSE u1.id 
        END as other_user_id,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT m.*, u.username as sender_username, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return result.rows.reverse();
  }

  async sendMessage(conversationId: string, senderId: string, content: string, type = 'text') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const messageRes = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [conversationId, senderId, content, type]
      );
      
      await client.query(
        `UPDATE conversations 
         SET updated_at = CURRENT_TIMESTAMP, last_message_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [conversationId]
      );
      
      // Get sender details for response
      const senderRes = await client.query('SELECT username, avatar FROM users WHERE id = $1', [senderId]);
      const message = {
        ...messageRes.rows[0],
        sender_username: senderRes.rows[0].username,
        sender_avatar: senderRes.rows[0].avatar
      };

      await client.query('COMMIT');
      return message;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
