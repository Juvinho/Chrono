import express, { Response } from 'express';
import { pool } from '../db/connection.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { ModerationService } from '../services/moderationService.js';

const router = express.Router();
const moderation = new ModerationService();

// List conversations for the authenticated user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await pool.query(
      `SELECT c.id, c.updated_at, c.last_message_at
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get or create conversation with username
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const otherUserId = userRes.rows[0].id;
    if (otherUserId === userId) return res.status(400).json({ error: 'Cannot create conversation with yourself' });

    // Find existing conversation with both participants
    const existing = await pool.query(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       LIMIT 1`,
      [userId, otherUserId]
    );
    if (existing.rows.length > 0) {
      return res.json({ id: existing.rows[0].id });
    }

    // Create new conversation and add participants
    const conv = await pool.query(
      `INSERT INTO conversations (created_by)
       VALUES ($1)
       RETURNING id`,
      [userId]
    );
    const conversationId = conv.rows[0].id;

    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT DO NOTHING`,
      [conversationId, userId, otherUserId]
    );

    res.status(201).json({ id: conversationId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List messages in a conversation (ascending)
router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { before, limit } = req.query as { before?: string; limit?: string };
    const lim = Math.min(parseInt(limit || '50'), 100);

    let sql = `SELECT id, sender_id, text, image_url, video_url, metadata, created_at
               FROM messages
               WHERE conversation_id = $1`;
    const params: any[] = [conversationId];
    if (before) {
      sql += ` AND created_at < $2`;
      params.push(new Date(before));
    }
    sql += ` ORDER BY created_at ASC LIMIT ${lim}`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;
    const { text, media } = req.body || {};

    if ((!text || text.trim().length === 0) && !media?.imageUrl && !media?.videoUrl) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Basic moderation
    const mod = await moderation.checkContent(text || '');
    if (mod.flagged) {
      return res.status(400).json({ error: mod.reason || 'Message blocked by moderation' });
    }

    await client.query('BEGIN');
    const insert = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, text, image_url, video_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, conversation_id, sender_id, text, image_url, video_url, metadata, created_at`,
      [conversationId, userId, text || null, media?.imageUrl || null, media?.videoUrl || null, media?.metadata ? JSON.stringify(media.metadata) : null]
    );

    await client.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP, last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    await client.query('COMMIT');
    res.status(201).json(insert.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Mark conversation as read
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;
    await pool.query(
      `UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update message status (delivered/read)
router.post('/:id/messages/:messageId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const messageId = req.params.messageId;
    const userId = req.userId!;
    const { status } = req.body as { status: 'delivered' | 'read' };
    if (!status) return res.status(400).json({ error: 'status required' });

    // Ensure message belongs to conversation
    const check = await pool.query(
      `SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2`,
      [messageId, conversationId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

    await pool.query(
      `INSERT INTO message_status (message_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, status) DO NOTHING`,
      [messageId, userId, status]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
