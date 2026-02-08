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
        ut.tag_key,
        ut.earned_at,
        ut.metadata,
        td.tag_key,
        td.display_name,
        td.icon,
        td.color,
        td.tag_type,
        td.criteria,
        td.display_order,
        td.is_active,
        td.description
      FROM user_tags ut
      JOIN tag_definitions td ON ut.tag_key = td.tag_key
      WHERE ut.user_id = $1
      ORDER BY td.display_order ASC, ut.earned_at DESC`,
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
       WHERE is_active = true 
       ORDER BY display_order ASC`
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
    const { userId, tagKey } = req.body;
    const adminId = req.body.adminId || (req as any).user?.id;

    // Check if user is admin
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if tag already exists for user
    const existingTag = await pool.query(
      `SELECT id FROM user_tags WHERE user_id = $1 AND tag_key = $2`,
      [userId, tagKey]
    );

    if (existingTag.rows.length > 0) {
      // Tag already exists, return it
      return res.json({ message: 'Tag already assigned', id: existingTag.rows[0].id });
    }

    // Create new tag assignment
    const result = await pool.query(
      `INSERT INTO user_tags (user_id, tag_key, earned_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [userId, tagKey]
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
    const { userId, tagKey } = req.body;
    const adminId = req.body.adminId || (req as any).user?.id;

    // Check if user is admin
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `DELETE FROM user_tags 
       WHERE user_id = $1 AND tag_key = $2
       RETURNING *`,
      [userId, tagKey]
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
       WHERE tag_type = $1 AND is_active = true
       ORDER BY display_order ASC`,
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
        td.display_name,
        td.tag_type,
        COUNT(ut.id) as total_users
      FROM tag_definitions td
      LEFT JOIN user_tags ut ON td.tag_key = ut.tag_key
      GROUP BY td.id, td.display_name, td.tag_type
      ORDER BY td.display_order ASC`
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
    const { tagKey } = req.params;
    const { displayName, displayOrder, description } = req.body;
    const adminId = (req as any).user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE tag_definitions 
       SET display_name = COALESCE($1, display_name),
           display_order = COALESCE($2, display_order),
           description = COALESCE($3, description)
       WHERE tag_key = $4
       RETURNING *`,
      [displayName || null, displayOrder || null, description || null, tagKey]
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
