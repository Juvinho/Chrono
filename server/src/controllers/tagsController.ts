import { Request, Response } from 'express';
import { pool } from '../db/connection.js';

// ==================== GET USER TAGS ====================
export async function getUserTags(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
        ut.id,
        ut.user_id,
        ut.tag_id,
        ut.adquirida_em,
        ut.removida_em,
        ut.ativo,
        td.nome,
        td.icone,
        td.cor_hex,
        td.cor_border,
        td.prioridade_exibicao,
        td.categoria,
        td.visibilidade,
        td.descricao_publica
      FROM user_tags ut
      JOIN tag_definitions td ON ut.tag_id = td.id
      WHERE ut.user_id = $1 AND ut.ativo = true
      ORDER BY td.prioridade_exibicao DESC, ut.adquirida_em DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting user tags:', error);
    res.status(500).json({ error: 'Failed to fetch user tags' });
  }
}

// ==================== GET ALL TAG DEFINITIONS ====================
export async function getTagDefinitions(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT * FROM tag_definitions 
       WHERE visibilidade = 'public' 
       ORDER BY prioridade_exibicao DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting tag definitions:', error);
    res.status(500).json({ error: 'Failed to fetch tag definitions' });
  }
}

// ==================== ADD TAG TO USER (ADMIN) ====================
export async function addUserTag(req: Request, res: Response) {
  try {
    const { userId, tagId } = req.body;
    const adminId = req.body.adminId || (req as any).user?.id;

    // Check if user is admin
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if tag already exists for user
    const existingTag = await pool.query(
      `SELECT id FROM user_tags WHERE user_id = $1 AND tag_id = $2`,
      [userId, tagId]
    );

    if (existingTag.rows.length > 0) {
      // If exists but inactive, reactivate it
      const existing = existingTag.rows[0];
      await pool.query(
        `UPDATE user_tags SET ativo = true, removida_em = NULL, motivo_remocao = NULL
         WHERE id = $1`,
        [existing.id]
      );
      return res.json({ message: 'Tag reactivated', tagId: existing.id });
    }

    // Create new tag assignment
    const result = await pool.query(
      `INSERT INTO user_tags (user_id, tag_id, ativo, adquirida_em)
       VALUES ($1, $2, true, NOW())
       RETURNING *`,
      [userId, tagId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding tag to user:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
}

// ==================== REMOVE TAG FROM USER (ADMIN) ====================
export async function removeUserTag(req: Request, res: Response) {
  try {
    const { userId, tagId } = req.body;
    const { motivo_remocao } = req.body;
    const adminId = req.body.adminId || (req as any).user?.id;

    // Check if user is admin
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE user_tags 
       SET ativo = false, removida_em = NOW(), motivo_remocao = $3
       WHERE user_id = $1 AND tag_id = $2
       RETURNING *`,
      [userId, tagId, motivo_remocao || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tag not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error removing tag from user:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
}

// ==================== GET TAGS BY CATEGORY ====================
export async function getTagsByCategory(req: Request, res: Response) {
  try {
    const { categoria } = req.params;

    const result = await pool.query(
      `SELECT * FROM tag_definitions 
       WHERE categoria = $1 AND visibilidade = 'public'
       ORDER BY prioridade_exibicao DESC`,
      [categoria]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting tags by category:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

// ==================== GET TAG STATISTICS ====================
export async function getTagStatistics(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT 
        td.nome,
        td.categoria,
        COUNT(ut.id) as total_users,
        COUNT(CASE WHEN ut.ativo = true THEN 1 END) as ativo_users,
        COUNT(CASE WHEN ut.ativo = false THEN 1 END) as removidos_users
      FROM tag_definitions td
      LEFT JOIN user_tags ut ON td.id = ut.tag_id
      GROUP BY td.id, td.nome, td.categoria
      ORDER BY td.prioridade_exibicao DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting tag statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

// ==================== UPDATE TAG DEFINITION (ADMIN) ====================
export async function updateTagDefinition(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const { nome, prioridade_exibicao, descricao_publica } = req.body;
    const adminId = (req as any).user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE tag_definitions 
       SET nome = COALESCE($1, nome),
           prioridade_exibicao = COALESCE($2, prioridade_exibicao),
           descricao_publica = COALESCE($3, descricao_publica),
           atualizado_em = NOW()
       WHERE id = $4
       RETURNING *`,
      [nome || null, prioridade_exibicao || null, descricao_publica || null, tagId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag definition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tag definition:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
}
