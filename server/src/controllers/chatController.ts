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
    
    if (!targetUserId) return res.status(400).json({ error: 'Target user required' });
    
    // Prevent self-messaging
    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    
    // Verify target user exists
    const targetUserResult = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [targetUserId]
    );
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    // TODO: Check if users have blocked each other
    // const isBlocked = await blockService.isBlocked(userId, targetUserId);
    // if (isBlocked) return res.status(403).json({ error: 'Cannot message this user' });
    
    let conversation = await chatService.getConversation(userId, targetUserId);
    if (!conversation) {
      conversation = await chatService.createConversation(userId, targetUserId);
    }
    
    // Get conversations in DTO format
    const conversations = await chatService.getUserConversations(userId);
    const result = conversations.find(c => c.id === conversation.id);
    
    res.json(result || conversation);
  } catch (error: any) {
    console.error('Error init conversation:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100); // 1-100, default 50
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0); // 0+
    
    const conversations = await chatService.getUserConversations(userId, limit, offset);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error getting conversations:', error);
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
    const { content } = req.body;
    
    const message = await chatService.sendMessage(conversationId, userId, content);
    
    // Emit socket events if io is available on app
    const io = req.app.get('io');
    if (io) {
      // Emit new message to conversation room
      io.to(conversationId).emit('new_message', message);
      
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