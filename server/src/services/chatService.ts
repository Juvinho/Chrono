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
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * Chat Service - Uses user1_id and user2_id columns
 * Works with existing Railway schema
 */
export class ChatService {
  /**
   * Find existing conversation between two users
   * Always stores smaller ID as user1_id
   */
  async getConversation(user1Id: string, user2Id: string) {
    try {
      // Normalize IDs so user1_id is always smaller
      const [min_id, max_id] = [user1Id, user2Id].sort();

      const result = await pool.query(
        `SELECT id FROM conversations 
         WHERE user1_id = $1 AND user2_id = $2
         LIMIT 1`,
        [min_id, max_id]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('getConversation error:', error.message);
      return null;
    }
  }

  /**
   * Create new conversation between two users
   */
  async createConversation(user1Id: string, user2Id: string) {
    try {
      // Normalize IDs so user1_id is always smaller
      const [min_id, max_id] = [user1Id, user2Id].sort();

      const result = await pool.query(
        `INSERT INTO conversations (user1_id, user2_id, created_at, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING id`,
        [min_id, max_id]
      );
      return { id: result.rows[0].id };
    } catch (error: any) {
      console.error('createConversation error:', error.message);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationDTO[]> {
    try {
      const result = await pool.query(
        `SELECT id, user1_id, user2_id, updated_at
         FROM conversations 
         WHERE user1_id = $1 OR user2_id = $1
         ORDER BY updated_at DESC LIMIT 50`,
        [userId]
      );

      const conversations: ConversationDTO[] = [];

      for (const row of result.rows) {
        try {
          // Get the other user
          const otherUserId = row.user1_id === userId ? row.user2_id : row.user1_id;
          
          const usersResult = await pool.query(
            `SELECT id, username, avatar FROM users WHERE id = $1`,
            [otherUserId]
          );

          if (usersResult.rows.length === 0) continue;

          const otherUser = usersResult.rows[0];

          // Get last message
          let lastMessage = null;
          try {
            const msgResult = await pool.query(
              `SELECT COALESCE(content, '') as msg_content, created_at FROM messages 
               WHERE conversation_id = $1 
               ORDER BY created_at DESC LIMIT 1`,
              [row.id]
            );
            if (msgResult.rows.length > 0) {
              lastMessage = {
                content: msgResult.rows[0].msg_content || '',
                sentAt: msgResult.rows[0].created_at,
                isRead: true,
              };
            }
          } catch (e) {
            // If messages table query fails, continue
          }

          conversations.push({
            id: row.id,
            otherUser: {
              id: otherUser.id,
              username: otherUser.username,
              displayName: otherUser.username,
              avatarUrl: otherUser.avatar || null,
            },
            lastMessage,
            unreadCount: 0,
            updatedAt: row.updated_at,
          });
        } catch (convError: any) {
          console.log('Processing conversation error:', convError.message?.substring(0, 80));
          continue;
        }
      }

      return conversations;
    } catch (error: any) {
      console.error('getUserConversations error:', error.message);
      return [];
    }
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string, userId?: string): Promise<MessageDTO[]> {
    try {
      const result = await pool.query(
        `SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          u.username,
          COALESCE(m.content, '') as content,
          m.created_at,
          COALESCE(m.is_read, false) as is_read
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        LIMIT 100`,
        [conversationId]
      );

      return result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderUsername: row.username,
        content: row.content,
        createdAt: row.created_at,
        isRead: row.is_read || false,
      }));
    } catch (error: any) {
      console.error('getMessages error:', error.message);
      return [];
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<MessageDTO> {
    try {
      // Verify conversation exists and user is participant
      const convCheck = await pool.query(
        `SELECT user1_id, user2_id FROM conversations WHERE id = $1`,
        [conversationId]
      );

      if (convCheck.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conv = convCheck.rows[0];
      const isParticipant = conv.user1_id === senderId || conv.user2_id === senderId;
      if (!isParticipant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Insert message
      let result;
      try {
        result = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
           VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
           RETURNING id, sender_id, content, created_at, is_read`,
          [conversationId, senderId, content]
        );
      } catch (e: any) {
        // If content field doesn't exist, try with just text insert
        if (e.message.includes('content')) {
          result = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, type, created_at)
             VALUES ($1, $2, 'text', CURRENT_TIMESTAMP)
             RETURNING id, sender_id, type as content, created_at`,
            [conversationId, senderId]
          );
        } else {
          throw e;
        }
      }

      // Update conversation updated_at
      await pool.query(
        `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
      );

      // Get sender info
      const senderResult = await pool.query(
        `SELECT username FROM users WHERE id = $1`,
        [senderId]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        conversationId: conversationId,
        senderId: row.sender_id,
        senderUsername: senderResult.rows[0]?.username || 'Unknown',
        content: row.content,
        createdAt: row.created_at,
        isRead: row.is_read || false,
      };
    } catch (error: any) {
      console.error('sendMessage error:', error.message);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE messages 
         SET is_read = true 
         WHERE conversation_id = $1 AND sender_id != $2`,
        [conversationId, userId]
      );
    } catch (error: any) {
      console.error('markAsRead error:', error.message);
    }
  }
}
