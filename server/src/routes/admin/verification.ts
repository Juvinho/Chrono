import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

router.use(requireAdmin);

// POST /api/admin/users/:id/verify - Dar verificação
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { badge_label = 'Verificado', badge_color = 'gold' } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET is_verified = true,
           verification_badge_label = $1,
           verification_badge_color = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, is_verified`,
      [badge_label, badge_color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ [ADMIN] User verified: ${id}`);

    res.json({
      success: true,
      message: 'User verified successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error verifying user:', error);
    res.status(500).json({
      error: 'Failed to verify user',
      message: error.message,
    });
  }
});

// POST /api/admin/users/:id/unverify - Remover verificação
router.post('/:id/unverify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users 
       SET is_verified = false,
           verification_badge_label = NULL,
           verification_badge_color = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, is_verified`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`❌ [ADMIN] User unverified: ${id}`);

    res.json({
      success: true,
      message: 'User unverified successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error unverifying user:', error);
    res.status(500).json({
      error: 'Failed to unverify user',
      message: error.message,
    });
  }
});

// GET /api/admin/users/:id/blocks - Ver bloqueios de um usuário
router.get('/:id/blocks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        username,
        display_name
      FROM users
      WHERE id = ANY(
        SELECT blocked_users FROM users WHERE id = $1
      )`,
      [id]
    );

    res.json({
      success: true,
      blocked_users: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({
      error: 'Failed to fetch blocks',
      message: error.message,
    });
  }
});

// POST /api/admin/users/:id/subscription - Alterar subscription tier
router.post('/:id/subscription', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;

    const validTiers = ['free', 'basic', 'premium', 'elite'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        validTiers,
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET subscription_tier = $1,
           subscription_expires_at = CASE 
             WHEN $1 = 'free' THEN NULL
             ELSE NOW() + INTERVAL '30 days'
           END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, subscription_tier, subscription_expires_at`,
      [tier, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`💎 [ADMIN] User subscription updated to ${tier}: ${id}`);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      message: error.message,
    });
  }
});

export default router;
