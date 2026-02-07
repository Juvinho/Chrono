import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

router.use(requireAdmin);

// GET /api/admin/posts - Listar todos os posts
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        p.created_at,
        p.updated_at,
        u.username,
        u.display_name,
        u.id as author_id,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM posts WHERE in_reply_to_id = p.id) as reply_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM posts');

    res.json({
      success: true,
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: error.message,
    });
  }
});

// GET /api/admin/posts/:id - Ver detalhes do post
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        p.image_url,
        p.video_url,
        p.created_at,
        p.updated_at,
        u.username,
        u.display_name,
        u.id as author_id,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM posts WHERE in_reply_to_id = p.id) as reply_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      success: true,
      post: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      error: 'Failed to fetch post',
      message: error.message,
    });
  }
});

// PUT /api/admin/posts/:id - Editar post
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const result = await pool.query(
      `UPDATE posts 
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, content, updated_at`,
      [content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    console.log(`✏️ [ADMIN] Post edited: ${id}`);

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    res.status(500).json({
      error: 'Failed to update post',
      message: error.message,
    });
  }
});

// DELETE /api/admin/posts/:id - Deletar post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const postCheck = await pool.query('SELECT author_id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    console.log(`🗑️ [ADMIN] Post deleted: ${id}`);

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      message: error.message,
    });
  }
});

// GET /api/admin/posts/search - Buscar posts
router.get('/search/by-user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        p.created_at,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count
      FROM posts p
      WHERE p.author_id = $1
      ORDER BY p.created_at DESC
      LIMIT 100`,
      [userId]
    );

    res.json({
      success: true,
      posts: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error searching posts:', error);
    res.status(500).json({
      error: 'Failed to search posts',
      message: error.message,
    });
  }
});

export default router;
