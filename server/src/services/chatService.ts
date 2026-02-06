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
        `INSERT INTO conversations (created_by, participant_ids, updated_at) 
         VALUES ($1, ARRAY[$1::UUID, $2::UUID]::UUID[], CURRENT_TIMESTAMP) 
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
      const result = await pool.query(
        `WITH all_conversations AS (
          SELECT id, participant_ids, updated_at
          FROM conversations 
          WHERE $1 = ANY(participant_ids)
        ),
        other_users AS (
          SELECT ac.id as conv_id, u.id, u.username, u.display_name, u.avatar
          FROM all_conversations ac
          JOIN users u ON u.id = ANY(ac.participant_ids) AND u.id != $1
        ),
        last_messages AS (
          SELECT 
            conversation_id,
            id,
            content,
            created_at,
            is_read,
            ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
          FROM messages
          WHERE conversation_id IN (SELECT id FROM all_conversations)
        )
        SELECT 
          ac.id,
          ac.updated_at,
          ou.id as other_user_id,
          ou.username,
          ou.display_name,
          ou.avatar,
          lm.content as last_message_content,
          lm.created_at as last_message_time,
          COALESCE((SELECT COUNT(*) FROM messages m 
            WHERE m.conversation_id = ac.id AND m.is_read = false AND m.sender_id != $1), 0) as unread_count
        FROM all_conversations ac
        JOIN other_users ou ON ou.conv_id = ac.id
        LEFT JOIN last_messages lm ON ac.id = lm.conversation_id AND lm.rn = 1
        ORDER BY ac.updated_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        otherUser: {
          id: row.other_user_id,
          username: row.username,
          displayName: row.display_name || row.username,
          avatarUrl: row.avatar || null,
        },
        lastMessage: row.last_message_content ? {
          content: row.last_message_content,
          sentAt: row.last_message_time,
          isRead: row.last_message_is_read || false,
        } : null,
        unreadCount: row.unread_count || 0,
        updatedAt: row.updated_at,
      }));
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
        isRead: row.is_read,
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
