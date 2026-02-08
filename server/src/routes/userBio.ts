import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { UserBioService } from '../services/userBioService.js';
import { pool } from '../db/connection.js';

const router = Router();
const bioService = new UserBioService();

// GET /api/users/:userId/bio - Buscar bio completa do usuário
router.get('/:userId/bio', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    // Busca bio customizada
    const userResult = await pool.query(`
      SELECT id, bio FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const customBio = userResult.rows[0].bio;
    
    // Gera bio automática
    const autoBio = await bioService.generateAutoBio(userId);
    
    // Busca tags do usuário
    const tags = await bioService.getUserTags(userId);
    
    res.json({
      customBio,
      autoBio,
      tags,
    });
    
  } catch (error) {
    console.error('Error fetching user bio:', error);
    res.status(500).json({ error: 'Failed to fetch user bio' });
  }
});

// POST /api/users/:userId/bio/refresh - Atualizar tags automáticas
router.post('/:userId/bio/refresh', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    // @ts-ignore
    const requesterId = req.user?.id;
    
    // Apenas o próprio usuário ou admin pode atualizar
    if (userId !== requesterId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await bioService.updateUserTags(userId);
    const tags = await bioService.getUserTags(userId);
    
    res.json({
      success: true,
      message: 'Tags updated',
      tags,
    });
    
  } catch (error) {
    console.error('Error refreshing tags:', error);
    res.status(500).json({ error: 'Failed to refresh tags' });
  }
});

// GET /api/tags - Listar todas as tags do sistema
router.get('/system/tags', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        tag_key,
        display_name,
        description,
        color,
        icon,
        tag_type,
        display_order
      FROM tag_definitions
      WHERE is_active = true
      ORDER BY display_order ASC
    `);
    
    const tags = result.rows.map(row => ({
      key: row.tag_key,
      displayName: row.display_name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      type: row.tag_type,
    }));
    
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

export default router;
