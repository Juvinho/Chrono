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
      `SELECT 
         c.id, 
         c.updated_at, 
         c.last_message_at,
         u.username AS other_username
       FROM conversations c
       JOIN conversation_participants cp_me 
         ON cp_me.conversation_id = c.id AND cp_me.user_id = $1
       JOIN conversation_participants cp_other 
         ON cp_other.conversation_id = c.id AND cp_other.user_id <> $1
       JOIN users u 
         ON u.id = cp_other.user_id
       ORDER BY c.updated_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize or retrieve conversation by target user ID (Find or Create)
router.post('/init', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const userId = req.userId!;
    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'targetUserId required' });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const userRes = await client.query('SELECT id, username, display_name, avatar FROM users WHERE id = $1 LIMIT 1', [targetUserId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const otherUserId = userRes.rows[0].id;

    const existing = await client.query(
      `SELECT c.id
       FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM conversation_participants cp 
         WHERE cp.conversation_id = c.id AND cp.user_id = $1
       ) AND EXISTS (
         SELECT 1 FROM conversation_participants cp 
         WHERE cp.conversation_id = c.id AND cp.user_id = $2
       )
       ORDER BY c.updated_at DESC
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (existing.rows.length > 0) {
      const conversationId = existing.rows[0].id;
      return res.status(200).json({ id: conversationId, isNew: false });
    }

    await client.query('BEGIN');
    const conv = await client.query(
      `INSERT INTO conversations (created_by, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId]
    );
    const conversationId = conv.rows[0].id;

    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId, otherUserId]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: conversationId, isNew: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// Get or create conversation with username
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const userId = req.userId!;
    const { username } = req.body || {};
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' });
    }

    const userRes = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const otherUserId = userRes.rows[0].id;
    if (otherUserId === userId) return res.status(400).json({ error: 'Cannot create conversation with yourself' });

    // Try to find an existing conversation between these two users
    const existing = await client.query(
      `SELECT c.id
       FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM conversation_participants cp 
         WHERE cp.conversation_id = c.id AND cp.user_id = $1
       ) AND EXISTS (
         SELECT 1 FROM conversation_participants cp 
         WHERE cp.conversation_id = c.id AND cp.user_id = $2
       )
       ORDER BY c.updated_at DESC
       LIMIT 1`,
      [userId, otherUserId]
    );
    if (existing.rows.length > 0) {
      return res.json({ id: existing.rows[0].id, conversationId: existing.rows[0].id });
    }

    await client.query('BEGIN');
    const conv = await client.query(
      `INSERT INTO conversations (created_by, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId]
    );
    const conversationId = conv.rows[0].id;

    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId, otherUserId]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: conversationId, conversationId });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// List messages in a conversation (ascending)
router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;
    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    );
    if (isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }
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

// Get conversation details (participants and timestamps)
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;

    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    );
    if (isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const convRes = await pool.query(
      `SELECT id, created_at, updated_at, last_message_at FROM conversations WHERE id = $1`,
      [conversationId]
    );
    if (convRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const participantsRes = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );
    res.json({
      ...convRes.rows[0],
      participants: participantsRes.rows.map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar || null
      }))
    });
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
    const participantCheck = await client.query(
      `SELECT COUNT(*) AS cnt FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    if (parseInt(participantCheck.rows[0].cnt) === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }
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

// Simple typing status (in-memory)
const typingState: Map<string, Set<string>> = new Map();

router.post('/:id/typing', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;
    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    );
    if (isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }
    const set = typingState.get(conversationId) || new Set<string>();
    set.add(userId);
    typingState.set(conversationId, set);
    setTimeout(() => {
      const s = typingState.get(conversationId);
      if (s) {
        s.delete(userId);
        typingState.set(conversationId, s);
      }
    }, 2500);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SSE stream for new messages and typing indicators
router.get('/:id/stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;
    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    );
    if (isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let lastCheck = new Date();
    const interval = setInterval(async () => {
      try {
        await pool.query(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
        const messages = await pool.query(
          `SELECT id, sender_id, text, image_url, video_url, metadata, created_at
           FROM messages
           WHERE conversation_id = $1 AND created_at > $2
           ORDER BY created_at ASC`,
          [conversationId, lastCheck]
        );
        lastCheck = new Date();
        if (messages.rows.length > 0) {
          res.write(`event: messages\n`);
          res.write(`data: ${JSON.stringify(messages.rows)}\n\n`);
        }
        const typingUsers = Array.from(typingState.get(conversationId) || new Set<string>()).filter(id => id !== userId);
        res.write(`event: typing\n`);
        res.write(`data: ${JSON.stringify({ users: typingUsers })}\n\n`);
      } catch (e) {
        // no-op
      }
    }, 1500);

    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
