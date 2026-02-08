import { Response } from 'express';
import { ChatService } from '../services/chatService.js';
import { UserService } from '../services/userService.js';
import { AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const chatService = new ChatService();
const userService = new UserService();

export const initConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { targetUserId } = req.body;
    
    console.log('🔗 initConversation called:', {
      userId,
      userId_type: typeof userId,
      targetUserId,
      targetUserId_type: typeof targetUserId,
      bodyKeys: Object.keys(req.body)
    });
    
    if (!targetUserId) {
      console.error('❌ No targetUserId provided');
      return res.status(400).json({ error: 'Target user required' });
    }
    
    // Prevent self-messaging
    if (userId === targetUserId) {
      console.error('❌ User trying to message themselves:', userId);
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    
    // Verify target user exists
    const targetUserResult = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [targetUserId]
    );
    if (targetUserResult.rows.length === 0) {
      console.error('❌ Target user not found:', targetUserId);
      return res.status(404).json({ error: 'Target user not found' });
    }

    console.log('✅ Target user exists');
    
    // TODO: Check if users have blocked each other
    // const isBlocked = await blockService.isBlocked(userId, targetUserId);
    // if (isBlocked) return res.status(403).json({ error: 'Cannot message this user' });
    
    let conversation = await chatService.getConversation(userId, targetUserId);
    console.log('🔍 Existing conversation lookup:', conversation?.id || 'none found');
    
    if (!conversation) {
      console.log('📝 Creating new conversation...');
      conversation = await chatService.createConversation(userId, targetUserId);
      console.log('✅ Created:', conversation.id);
    }
    
    // Get conversations in DTO format
    console.log('📥 Fetching conversations in DTO format...');
    const conversations = await chatService.getUserConversations(userId);
    console.log('📊 Found', conversations.length, 'conversations');
    
    const result = conversations.find(c => c.id === conversation.id);
    
    const responseData = result || conversation;
    console.log('📤 initConversation response:', {
      hasResult: !!result,
      responseId: responseData.id,
      responseId_type: typeof responseData.id,
      hasOtherUser: !!responseData.otherUser,
      otherUserId: responseData.otherUser?.id,
      keys: Object.keys(responseData)
    });
    
    if (!responseData.id) {
      console.error('❌ Response missing ID!', responseData);
      return res.status(500).json({ error: 'Response generation failed' });
    }
    
    res.json(responseData);
  } catch (error: any) {
    console.error('❌ Error init conversation:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100); // 1-100, default 50
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0); // 0+
    
    console.log('📋 getConversations called:', {
      userId,
      userIdType: typeof userId,
      limit,
      offset,
      timestamp: new Date().toISOString()
    });
    
    const conversations = await chatService.getUserConversations(userId, limit, offset);
    
    console.log('📤 getConversations response:', {
      userId,
      count: conversations.length,
      conversationIds: conversations.map(c => c.id),
      timestamp: new Date().toISOString()
    });
    
    // Diagnose empty result
    if (conversations.length === 0) {
      console.warn('⚠️ User has no conversations - checking database directly...');
      
      // Check if user exists and has any conversations raw
      const checkResult = await require('../db/connection').pool.query(
        `SELECT COUNT(*) as count FROM conversations WHERE user1_id = $1::uuid OR user2_id = $1::uuid`,
        [userId]
      );
      
      const dbCount = checkResult.rows[0]?.count || 0;
      console.warn('🔍 Database check:', {
        userId,
        totalConversationsInDB: dbCount,
        timestamp: new Date().toISOString()
      });
      
      if (dbCount > 0) {
        console.error('❌ CRITICAL: Found conversations in DB but getUserConversations returned empty!');
      }
    }
    
    res.json(conversations);
  } catch (error: any) {
    console.error('❌ Error getting conversations:', {
      message: error.message,
      code: error.code,
      userId: req.userId,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId!;
    
    // Verify user is a participant in this conversation
    const conversation = await chatService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }
    
    const messages = await chatService.getMessages(conversationId, userId);
    res.json(messages);
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    const { content, imageUrl } = req.body;
    
    console.log('📨 sendMessage called:', {
      userId,
      conversationId,
      conversationIdType: typeof conversationId,
      contentLength: content?.length,
      hasImage: !!imageUrl,
      url: req.originalUrl,
      method: req.method
    });
    
    const message = await chatService.sendMessage(conversationId, userId, content, imageUrl);
    
    // Emit socket events if io is available on app
    const io = req.app.get('io');
    if (io) {
      // Emit new message to conversation room with acknowledgment
      const room = io.to(conversationId);
      
      // Use acknowledgments for message delivery confirmation
      room.emit('new_message', message, (ack?: any) => {
        console.log(`Message ${message.id} acknowledged`);
      });
      
      // Emit conversation update (lastMessage, updatedAt) to both users
      const conversation = await chatService.getConversationById(conversationId);
      if (conversation) {
        const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
        
        const conversationUpdate = {
          id: conversationId,
          lastMessage: {
            content: message.content,
            sentAt: message.sentAt,
            isRead: false,
          },
          updatedAt: message.sentAt,
        };
        
        // Emit to both participants
        io.to(userId).emit('conversation_updated', conversationUpdate);
        io.to(otherUserId).emit('conversation_updated', conversationUpdate);
      }
    }

    res.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
};
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    
    // Verify user is a participant
    const conversation = await chatService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }
    
    // Mark all messages from other user as read
    await chatService.markAsRead(conversationId, userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * ADMIN: Reindex conversations for a user
 * Removes orphaned conversations and rebuilds conversation list
 */
export const reindexConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    console.log('🔧 Reindexing conversations for user:', userId);
    
    // Step 1: Find orphaned conversations (where other user doesn't exist)
    const orphanedResult = await pool.query(
      `SELECT c.id, c.user1_id, c.user2_id
       FROM conversations c
       WHERE (c.user1_id = $1::uuid OR c.user2_id = $1::uuid)
       AND (
         NOT EXISTS (SELECT 1 FROM users WHERE id = c.user1_id)
         OR NOT EXISTS (SELECT 1 FROM users WHERE id = c.user2_id)
       )`,
      [userId]
    );
    
    const orphanedConversations = orphanedResult.rows;
    console.log('🗑️ Found orphaned conversations:', orphanedConversations.length);
    
    // Step 2: Delete orphaned conversations
    let deletedCount = 0;
    for (const conv of orphanedConversations) {
      await pool.query(
        `DELETE FROM conversations WHERE id = $1::uuid`,
        [conv.id]
      );
      deletedCount++;
    }
    
    console.log('✅ Deleted orphaned conversations:', deletedCount);
    
    // Step 3: Count valid conversations
    const validResult = await pool.query(
      `SELECT COUNT(*) as count FROM conversations 
       WHERE user1_id = $1::uuid OR user2_id = $1::uuid`,
      [userId]
    );
    
    const validCount = validResult.rows[0]?.count || 0;
    console.log('📋 Valid conversations remaining:', validCount);
    
    // Step 4: Rebuild conversation list
    const conversations = await chatService.getUserConversations(userId, 50, 0);
    
    console.log('🔄 Reindexing complete:', {
      orphanedDeleted: deletedCount,
      validConversations: validCount,
      rebuiltConversations: conversations.length
    });
    
    res.json({
      success: true,
      diagnostics: {
        orphanedDeleted: deletedCount,
        validConversations: validCount,
        rebuiltConversations: conversations.length,
        conversations
      }
    });
  } catch (error: any) {
    console.error('Error reindexing conversations:', {
      message: error.message,
      code: error.code,
      userId: req.userId
    });
    res.status(500).json({ 
      error: error.message,
      details: 'Falha ao reindexar conversas'
    });
  }
};