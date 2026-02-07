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

/**
 * Chat Service - Uses user1_id and user2_id columns
 * Works with existing Railway schema
 */
export class ChatService {
  /**
   * Find existing conversation between two users
   * Always stores smaller ID as user1_id (using UUID comparison)
   */
  async getConversation(user1Id: string, user2Id: string) {
    try {
      // Compare UUIDs correctly - let PostgreSQL handle the comparison
      // Use LEAST and GREATEST functions which work with UUIDs
      const result = await pool.query(
        `SELECT id FROM conversations 
         WHERE (user1_id = $1 AND user2_id = $2) 
            OR (user1_id = $2 AND user2_id = $1)
         LIMIT 1`,
        [user1Id, user2Id]
      );

      console.log('🔍 getConversation query result:', {
        user1Id,
        user2Id,
        found: result.rows.length > 0,
        conversationId: result.rows[0]?.id
      });

      return result.rows[0] || null;
    } catch (error: any) {
      console.error('getConversation error:', error.message);
      return null;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string) {
    try {
      const result = await pool.query(
        `SELECT id, user1_id, user2_id, created_at, updated_at FROM conversations WHERE id = $1`,
        [conversationId]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('getConversationById error:', error.message);
      return null;
    }
  }

  /**
   * Create new conversation between two users
   * PostgreSQL automatically handles UUID comparison with CHECK constraint
   */
  async createConversation(user1Id: string, user2Id: string) {
    try {
      // PostgreSQL LEAST and GREATEST will correctly compare UUIDs
      // This ensures user1_id < user2_id in UUID ordering, not string ordering
      const result = await pool.query(
        `INSERT INTO conversations (user1_id, user2_id, created_at, updated_at) 
         VALUES (LEAST($1, $2), GREATEST($1, $2), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING id`,
        [user1Id, user2Id]
      );

      console.log('✅ createConversation result:', {
        conversationId: result.rows[0].id,
        user1Id,
        user2Id
      });

      return { id: result.rows[0].id };
    } catch (error: any) {
      console.error('createConversation error:', error.message);
      throw error;
    }
  }

  /**
   * Get all conversations for a user with pagination
   */
  async getUserConversations(userId: string, limit: number = 50, offset: number = 0): Promise<ConversationDTO[]> {
    try {
      const result = await pool.query(
        `SELECT id, user1_id, user2_id, updated_at
         FROM conversations 
         WHERE user1_id = $1 OR user2_id = $1
         ORDER BY updated_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const conversations: ConversationDTO[] = [];

      for (const row of result.rows) {
        try {
          // Get the other user
          const otherUserId = row.user1_id === userId ? row.user2_id : row.user1_id;
          
          const usersResult = await pool.query(
            `SELECT id, username, COALESCE(display_name, username) as display_name, avatar FROM users WHERE id = $1`,
            [otherUserId]
          );

          if (usersResult.rows.length === 0) continue;

          const otherUser = usersResult.rows[0];

          // Get last message
          let lastMessage = null;
          try {
            const msgResult = await pool.query(
              `SELECT content, created_at, is_read FROM messages 
               WHERE conversation_id = $1 
               ORDER BY created_at DESC LIMIT 1`,
              [row.id]
            );
            if (msgResult.rows.length > 0) {
              lastMessage = {
                content: msgResult.rows[0].content,
                sentAt: msgResult.rows[0].created_at,
                isRead: msgResult.rows[0].is_read,
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
              displayName: otherUser.display_name,
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
          u.id as user_id,
          u.username,
          COALESCE(u.display_name, u.username) as display_name,
          u.avatar as avatar_url,
          m.content,
          m.created_at,
          m.is_read
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
        sender: {
          id: row.user_id,
          username: row.username,
          displayName: row.display_name || row.username,
          avatarUrl: row.avatar_url || null,
        },
        content: row.content,
        sentAt: row.created_at,
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
      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }
      if (content.length > 1000) {
        throw new Error('Message cannot exceed 1000 characters');
      }

      console.log('📨 ChatService.sendMessage:', {
        conversationId,
        conversationIdType: typeof conversationId,
        senderId,
        senderIdType: typeof senderId,
        contentLength: content.length
      });

      // Verify conversation exists and user is participant
      const convCheck = await pool.query(
        `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1`,
        [conversationId]
      );

      console.log('🔍 Conversation lookup result:', {
        found: convCheck.rows.length > 0,
        rowCount: convCheck.rows.length,
        rows: convCheck.rows
      });

      if (convCheck.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conv = convCheck.rows[0];
      const isParticipant = conv.user1_id === senderId || conv.user2_id === senderId;
      if (!isParticipant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Insert message
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
         RETURNING id, sender_id, content, created_at, is_read`,
        [conversationId, senderId, content]
      );

      // Update conversation updated_at
      await pool.query(
        `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
      );

      // Get sender info
      const senderResult = await pool.query(
        `SELECT id, username, COALESCE(display_name, '') as display_name, avatar FROM users WHERE id = $1`,
        [senderId]
      );

      if (senderResult.rows.length === 0) {
        throw new Error('Sender not found');
      }

      const sender = senderResult.rows[0];
      const row = result.rows[0];
      
      return {
        id: row.id,
        conversationId: conversationId,
        sender: {
          id: sender.id,
          username: sender.username,
          displayName: sender.display_name || sender.username,
          avatarUrl: sender.avatar || null,
        },
        content: row.content,
        sentAt: row.created_at,
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
