import express from 'express';
import { ConversationService } from '../services/conversationService.js';
import { UserService } from '../services/userService.js';
import { NotificationService } from '../services/notificationService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const conversationService = new ConversationService();
const userService = new UserService();
const notificationService = new NotificationService();

// Get all conversations for current user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await conversationService.getConversations(req.userId);

    // Enrich with user info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map(async (username) => {
            const user = await userService.getUserByUsername(username);
            return user
              ? {
                  username: user.username,
                  avatar: user.avatar,
                  bio: user.bio,
                }
              : null;
          })
        );

        const messages = await Promise.all(
          conv.messages.map(async (msg) => {
            const sender = await userService.getUserById(msg.senderId);
            return {
              ...msg,
              senderUsername: sender?.username || 'unknown',
            };
          })
        );

        return {
          ...conv,
          participants: participants.filter((p) => p !== null),
          messages,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversations' });
  }
});

// Create or get conversation (with options)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username, isEncrypted, selfDestructTimer } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationId = await conversationService.getOrCreateConversation(
        req.userId, 
        targetUser.id, 
        { isEncrypted, selfDestructTimer }
    );

    res.json({ conversationId });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create conversation' });
  }
});

// Get or create conversation (legacy GET)
router.get('/with/:username', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationId = await conversationService.getOrCreateConversation(req.userId, targetUser.id);

    res.json({ conversationId });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversation' });
  }
});

// Send message
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { text, media } = req.body;

    if (!text && !media) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const message = await conversationService.sendMessage(id, req.userId!, text, media);

    // Create notification for recipient
    const conv = await pool.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [id, req.userId]
    );

    if (conv.rows.length > 0) {
      const recipientId = conv.rows[0].user_id;
      await notificationService.createNotification(recipientId, req.userId!, 'directMessage');
    }

    const sender = await userService.getUserById(req.userId!);

    res.status(201).json({
      ...message,
      senderUsername: sender?.username || 'unknown',
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Update message status (delivered/read)
router.post('/:id/messages/:messageId/status', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body;

        if (!['delivered', 'read'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await conversationService.updateMessageStatus(messageId, req.userId!, status);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Update status error:', error);
        res.status(500).json({ error: error.message || 'Failed to update status' });
    }
});

// Mark conversation as read
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await conversationService.markAsRead(id, req.userId!);
    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

export default router;

