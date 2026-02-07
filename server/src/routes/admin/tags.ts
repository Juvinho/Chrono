import { Router, Request, Response } from 'express';
import { requireAdmin, logAdminAction } from '../../middleware/adminAuth.js';
import { pool } from '../../db/connection.js';

const router = Router();

// Todas as rotas requerem autenticação admin
router.use(requireAdmin);

// GET /api/admin/tags - Listar todas as tags
router.get('/', logAdminAction('List Tags'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.created_at,
        COUNT(pt.post_id) as post_count
      FROM tags t
      LEFT JOIN post_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);

    res.json({
      tags: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error listing tags:', error);
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

// POST /api/admin/tags - Criar nova tag
router.post('/', logAdminAction('Create Tag'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name required' });
    }

    const normalizedName = name.trim().toLowerCase();

    // Verifica se já existe
    const existing = await pool.query(
      'SELECT id FROM tags WHERE LOWER(name) = $1',
      [normalizedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    // Cria tag
    const result = await pool.query(
      'INSERT INTO tags (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );

    console.log(`✅ [ADMIN] Tag created: ${name}`);

    res.status(201).json({
      success: true,
      tag: result.rows[0],
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// PUT /api/admin/tags/:id - Atualizar tag
router.put('/:id', logAdminAction('Update Tag'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name required' });
    }

    const result = await pool.query(
      'UPDATE tags SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log(`✅ [ADMIN] Tag updated: ${name}`);

    res.json({
      success: true,
      tag: result.rows[0],
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /api/admin/tags/:id - Deletar tag
router.delete('/:id', logAdminAction('Delete Tag'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verifica quantos posts usam essa tag
    const usage = await pool.query(
      'SELECT COUNT(*) as count FROM post_tags WHERE tag_id = $1',
      [id]
    );

    const postCount = parseInt(usage.rows[0].count, 10);

    // Delete da tag (cascade vai remover de post_tags também)
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log(`🗑️  [ADMIN] Tag deleted: ${result.rows[0].name} (used in ${postCount} posts)`);

    res.json({
      success: true,
      deletedTag: result.rows[0].name,
      affectedPosts: postCount,
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
