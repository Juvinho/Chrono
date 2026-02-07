import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

router.use(requireAdmin);

// GET /api/admin/tags - Listar todas as tags
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        is_featured,
        post_count,
        created_at,
        updated_at
      FROM tags
      ORDER BY post_count DESC`
    );

    res.json({
      success: true,
      tags: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      error: 'Failed to fetch tags',
      message: error.message,
    });
  }
});

// POST /api/admin/tags - Criar nova tag
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description = '' } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = await pool.query(
      `INSERT INTO tags (name, description, post_count, is_featured)
       VALUES ($1, $2, 0, false)
       ON CONFLICT (name) DO NOTHING
       RETURNING id, name, description, post_count`,
      [name.trim().toLowerCase(), description]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    console.log(`🏷️ [ADMIN] Tag created: ${name}`);

    res.json({
      success: true,
      message: 'Tag created successfully',
      tag: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      error: 'Failed to create tag',
      message: error.message,
    });
  }
});

// PUT /api/admin/tags/:id - Editar tag
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_featured } = req.body;

    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name.toLowerCase());
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
      paramCount++;
    }

    if (is_featured !== undefined) {
      updateFields.push(`is_featured = $${paramCount}`);
      updateValues.push(is_featured);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const query = `
      UPDATE tags
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, is_featured
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log(`✏️ [ADMIN] Tag updated: ${id}`);

    res.json({
      success: true,
      message: 'Tag updated successfully',
      tag: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      error: 'Failed to update tag',
      message: error.message,
    });
  }
});

// DELETE /api/admin/tags/:id - Deletar tag
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tagCheck = await pool.query('SELECT name FROM tags WHERE id = $1', [id]);
    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const tagName = tagCheck.rows[0].name;
    await pool.query('DELETE FROM tags WHERE id = $1', [id]);

    console.log(`🗑️ [ADMIN] Tag deleted: ${tagName}`);

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      error: 'Failed to delete tag',
      message: error.message,
    });
  }
});

// POST /api/admin/tags/:id/feature - Destacar tag
router.post('/:id/feature', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE tags
       SET is_featured = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, is_featured`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log(`⭐ [ADMIN] Tag featured: ${result.rows[0].name}`);

    res.json({
      success: true,
      message: 'Tag featured successfully',
      tag: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error featuring tag:', error);
    res.status(500).json({
      error: 'Failed to feature tag',
      message: error.message,
    });
  }
});

// POST /api/admin/tags/:id/unfeature - Remover destaque de tag
router.post('/:id/unfeature', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE tags
       SET is_featured = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, is_featured`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log(`⭕ [ADMIN] Tag unfeatured: ${result.rows[0].name}`);

    res.json({
      success: true,
      message: 'Tag unfeatured successfully',
      tag: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error unfeaturung tag:', error);
    res.status(500).json({
      error: 'Failed to unfeature tag',
      message: error.message,
    });
  }
});

export default router;
