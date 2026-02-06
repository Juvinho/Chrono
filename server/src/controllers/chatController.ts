import { Response } from 'express';
import { ChatService } from '../services/chatService.js';
import { AuthRequest } from '../middleware/auth.js';

const chatService = new ChatService();

export const initConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { targetUserId } = req.body;
    
    if (!targetUserId) return res.status(400).json({ error: 'Target user required' });
    
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
    const conversations = await chatService.getUserConversations(userId);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
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
    
    // Emit socket event if io is available on app
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('new_message', message);
    }

    res.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
};
