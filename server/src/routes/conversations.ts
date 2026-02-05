import express, { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ConversationService } from '../services/conversationService.js';
import { UserService } from '../services/userService.js';
import { NotificationService } from '../services/notificationService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const conversationService = new ConversationService();
const userService = new UserService();
const notificationService = new NotificationService();

// Rate limiting for messaging endpoints to prevent spam
const messageRateLimiter = rateLimit({
  windowMs: 10_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Basic sanitization
const sanitizeText = (text: string) => {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .trim();
};

// Get all conversations for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await conversationService.getConversations(req.userId);

    // Enrich with user info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map(async (username: string) => {
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
          conv.messages.map(async (msg: any) => {
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
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.get('/with/:username', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/:id/messages', authenticateToken, messageRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text, media } = req.body;

    if (!text && !media) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const cleanText = typeof text === 'string' ? sanitizeText(text) : text;

    const startTs = Date.now();
    if (typeof cleanText === 'string') {
      const len = cleanText.length;
      console.log(`[DM] Validating message length: ${len} chars for conversation ${id}`);
      if (len > 10000) {
        console.warn(`[DM] Message too long: ${len} > 10000`);
        return res.status(413).json({ error: 'Message too long (max 10000 characters)' });
      }
    }

    const message = await conversationService.sendMessage(id, req.userId!, cleanText, media);
    console.log(`[DM] Inserted message ${message.id} in ${Date.now() - startTs}ms`);

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
    console.error('[DM] Send message error:', {
      message: error.message,
      stack: error.stack,
      payloadSize: typeof req.body?.text === 'string' ? req.body.text.length : 0,
      conversation: req.params.id
    });
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Paginated messages listing (newest first)
router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { before, limit } = req.query as { before?: string, limit?: string };
    const lim = Math.min(Math.max(parseInt(limit || '50'), 1), 200);
    const beforeTs = before ? new Date(before) : null;

    const baseSql = `
      SELECT m.* 
      FROM messages m
      WHERE m.conversation_id = $1
        AND (m.delete_at IS NULL OR m.delete_at > CURRENT_TIMESTAMP)
        ${beforeTs ? 'AND m.created_at < $2' : ''}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${lim}
    `;
    const params: any[] = [id];
    if (beforeTs) params.push(beforeTs.toISOString());

    const rows = await pool.query(baseSql, params);
    res.json(rows.rows);
  } catch (error: any) {
    console.error('[DM] Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

// Update message status (delivered/read)
// Update message status (delivered/read)
router.post('/:id/messages/:messageId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await conversationService.markAsRead(id, req.userId!);
    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

// Search messages in a conversation
router.get('/:id/messages/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '50'), 1), 200);
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const rows = await pool.query(
      `SELECT id, conversation_id, sender_id, text, created_at 
       FROM messages 
       WHERE conversation_id = $1 
         AND (delete_at IS NULL OR delete_at > CURRENT_TIMESTAMP)
         AND text ILIKE '%' || $2 || '%'
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}`,
      [id, q]
    );
    res.json(rows.rows);
  } catch (error: any) {
    console.error('[DM] Search messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to search messages' });
  }
});

export default router;

