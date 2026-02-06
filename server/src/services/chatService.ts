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
 * Chat Service - Simplified implementation without conversation_participants table
 * Stores participants directly in conversations table as array
 */
export class ChatService {
  /**
   * Find existing conversation between two users
   */
  async getConversation(user1Id: string, user2Id: string) {
    try {
      // Find conversation where both users are in participant_ids
      const result = await pool.query(
        `SELECT id FROM conversations 
         WHERE participant_ids @> ARRAY[$1::UUID, $2::UUID]::UUID[]
         ORDER BY updated_at DESC LIMIT 1`,
        [user1Id, user2Id]
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
      const result = await pool.query(
        `INSERT INTO conversations (participant_ids) 
         VALUES (ARRAY[$1::UUID, $2::UUID]::UUID[]) 
         RETURNING id`,
        [user1Id, user2Id]
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
      // Simple approach: get conversations, then fetch other user info
      const result = await pool.query(
        `SELECT id, updated_at FROM conversations 
         WHERE $1 = ANY(participant_ids)
         ORDER BY updated_at DESC LIMIT 50`,
        [userId]
      );

      const conversations: ConversationDTO[] = [];

      for (const row of result.rows) {
        try {
          // Get other users in this conversation
          const usersResult = await pool.query(
            `SELECT u.id, u.username, u.avatar FROM users u
             WHERE u.id = ANY(
               SELECT unnest(participant_ids) FROM conversations 
               WHERE id = $1 AND id != $2
             )
             LIMIT 1`,
            [row.id, userId]
          );

          if (usersResult.rows.length === 0) continue;

          const otherUser = usersResult.rows[0];

          // Get last message
          let lastMessage = null;
          try {
            const msgResult = await pool.query(
              `SELECT COALESCE(content, text, '') as msg_content, created_at FROM messages 
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
          COALESCE(m.content, m.text, '') as content,
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
      // Verify sender is participant
      const convCheck = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)`,
        [conversationId, senderId]
      );

      if (convCheck.rows.length === 0) {
        throw new Error('User is not a participant in this conversation');
      }

      // Try to insert with content field, fallback to text if needed
      let result;
      try {
        result = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
           VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
           RETURNING id, sender_id, content, created_at, is_read`,
          [conversationId, senderId, content]
        );
      } catch (e: any) {
        // If content field doesn't exist, try with text field
        if (e.message.includes('content')) {
          result = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, text, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             RETURNING id, sender_id, text as content, created_at`,
            [conversationId, senderId, content]
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
