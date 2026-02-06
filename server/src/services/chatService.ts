import { pool } from '../db/connection.js';

interface ConversationDTO {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline?: boolean;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface MessageDTO {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  sentAt: string;
  isRead: boolean;
}

export class ChatService {
  async getConversation(user1Id: string, user2Id: string) {
    // Find a conversation where both users are participants
    const result = await pool.query(
      `SELECT c.id FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM conversation_participants cp1 
         WHERE cp1.conversation_id = c.id AND cp1.user_id = $1
       ) AND EXISTS (
         SELECT 1 FROM conversation_participants cp2 
         WHERE cp2.conversation_id = c.id AND cp2.user_id = $2
       )
       ORDER BY c.updated_at DESC LIMIT 1`,
      [user1Id, user2Id]
    );
    return result.rows[0];
  }

  async createConversation(user1Id: string, user2Id: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create conversation
      const convRes = await client.query(
        'INSERT INTO conversations (created_by, updated_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id',
        [user1Id]
      );
      const conversationId = convRes.rows[0].id;
      
      // Add both users as participants
      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [conversationId, user1Id, user2Id]
      );
      
      await client.query('COMMIT');
      return { id: conversationId };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getUserConversations(userId: string): Promise<ConversationDTO[]> {
    const result = await pool.query(
      `SELECT c.id, c.updated_at,
        u.id as other_user_id, u.username as other_username, u.display_name as other_display_name, u.avatar as other_avatar,
        m.id as last_msg_id, m.content as last_message_content, m.created_at as last_message_time,
        CASE WHEN ms.status = 'read' THEN true ELSE false END as last_msg_is_read
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       JOIN users u ON (
         SELECT user_id FROM conversation_participants cp2 
         WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 1
       ) = u.id
       LEFT JOIN messages m ON c.id = m.conversation_id
       LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $1 AND ms.status = 'read'
       WHERE cp.user_id = $1
       GROUP BY c.id, c.updated_at, u.id, u.username, u.display_name, u.avatar, m.id, m.content, m.created_at, ms.status
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      otherUser: {
        id: row.other_user_id,
        username: row.other_username,
        displayName: row.other_display_name || row.other_username,
        avatarUrl: row.other_avatar || null,
        isOnline: false, // TODO: implementar status online
      },
      lastMessage: row.last_message_content ? {
        content: row.last_message_content,
        sentAt: new Date(row.last_message_time).toISOString(),
        isRead: row.last_msg_is_read || false,
      } : null,
      unreadCount: 0, // TODO: contar mensagens não lidas
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async getMessages(conversationId: string, currentUserId?: string): Promise<MessageDTO[]> {
    const result = await pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at, u.username, u.display_name, u.avatar,
        CASE WHEN ms.status = 'read' THEN true ELSE false END as is_read
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $2 AND ms.status = 'read'
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId, currentUserId]
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      sender: {
        id: row.sender_id,
        username: row.username,
        displayName: row.display_name || row.username,
        avatarUrl: row.avatar || null,
      },
      content: row.content,
      sentAt: new Date(row.created_at).toISOString(),
      isRead: row.is_read || false,
    }));
  }

  async sendMessage(conversationId: string, senderId: string, content: string, type = 'text'): Promise<MessageDTO> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert message
      const messageRes = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, created_at`,
        [conversationId, senderId, content, type]
      );
      const messageId = messageRes.rows[0].id;
      const createdAt = messageRes.rows[0].created_at;
      
      // Update conversation timestamp
      await client.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      );
      
      // Get sender details
      const senderRes = await client.query(
        'SELECT id, username, display_name, avatar FROM users WHERE id = $1',
        [senderId]
      );
      const sender = senderRes.rows[0];
      
      const message: MessageDTO = {
        id: messageId,
        conversationId: conversationId,
        sender: {
          id: sender.id,
          username: sender.username,
          displayName: sender.display_name || sender.username,
          avatarUrl: sender.avatar || null,
        },
        content: content,
        sentAt: new Date(createdAt).toISOString(),
        isRead: false,
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
