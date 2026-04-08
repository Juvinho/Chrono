import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();

// GET /api/bookmarks - Get all bookmarks for the current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0 } = req.query;

    // SECURITY FIX C-11: Validate pagination parameters
    const rawLimit = parseInt(limit as string) || 50;
    const rawOffset = parseInt(offset as string) || 0;
    const safeLimit = Math.min(Math.max(1, rawLimit), 100); // Enforce 1-100 range
    const safeOffset = Math.max(0, rawOffset);

    const result = await pool.query(
      `SELECT b.id as bookmark_id, b.created_at as bookmarked_at, 
              p.id, p.author_id, p.content, p.image_url, p.video_url, 
              p.is_thread, p.is_private, p.mood, p.in_reply_to_id, 
              p.repost_of_id, p.thread_id, p.poll_options, p.poll_ends_at, 
              p.unlock_at, p.created_at,
              u.username as author_username, u.avatar as author_avatar, 
              u.bio as author_bio, u.is_verified as author_is_verified,
              u.verification_badge_label, u.verification_badge_color
       FROM bookmarks b
       JOIN posts p ON b.post_id = p.id
       JOIN users u ON p.author_id = u.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, safeLimit, safeOffset]
    );

    const bookmarks = result.rows.map((row: any) => ({
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      imageUrl: row.image_url,
      videoUrl: row.video_url,
      isThread: row.is_thread,
      isPrivate: row.is_private,
      mood: row.mood,
      inReplyToId: row.in_reply_to_id,
      repostOfId: row.repost_of_id,
      threadId: row.thread_id,
      pollOptions: row.poll_options,
      pollEndsAt: row.poll_ends_at,
      unlockAt: row.unlock_at,
      createdAt: row.created_at,
      bookmarkedAt: row.bookmarked_at,
      author: {
        username: row.author_username,
        avatar: row.author_avatar,
        bio: row.author_bio,
        isVerified: row.author_is_verified,
        verificationBadge: row.verification_badge_label ? {
          label: row.verification_badge_label,
          color: row.verification_badge_color
        } : undefined,
      },
      isBookmarked: true,
    }));

    res.json({
      bookmarks,
      limit: safeLimit,
      offset: safeOffset,
      hasMore: bookmarks.length === safeLimit,
    });
  } catch (error: any) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: error.message || 'Failed to get bookmarks' });
  }
});

// GET /api/bookmarks/ids - Get all bookmarked post IDs for the current user (lightweight)
router.get('/ids', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT post_id FROM bookmarks WHERE user_id = $1',
      [req.userId]
    );

    const postIds = result.rows.map((row: any) => row.post_id);
    res.json(postIds);
  } catch (error: any) {
    console.error('Get bookmark ids error:', error);
    res.status(500).json({ error: error.message || 'Failed to get bookmark ids' });
  }
});

// POST /api/bookmarks/:postId - Bookmark a post
router.post('/:postId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;

    // Check if post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Insert bookmark (ON CONFLICT to avoid duplicates)
    await pool.query(
      'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT (user_id, post_id) DO NOTHING',
      [req.userId, postId]
    );

    res.status(201).json({ message: 'Post salvo com sucesso!', bookmarked: true });
  } catch (error: any) {
    console.error('Bookmark post error:', error);
    res.status(500).json({ error: error.message || 'Failed to bookmark post' });
  }
});

// DELETE /api/bookmarks/:postId - Remove bookmark
router.delete('/:postId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;

    await pool.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2',
      [req.userId, postId]
    );

    res.json({ message: 'Bookmark removido.', bookmarked: false });
  } catch (error: any) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove bookmark' });
  }
});

export default router;
