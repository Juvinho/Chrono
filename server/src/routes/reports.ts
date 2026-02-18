import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();

// POST /api/reports - Create a new report
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reportedUserId, reportedPostId, reason, description } = req.body;

    if (!reportedUserId && !reportedPostId) {
      return res.status(400).json({ error: 'Você precisa informar o usuário ou post a ser denunciado.' });
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'impersonation', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Motivo da denúncia inválido.' });
    }

    // Can't report yourself
    if (reportedUserId === req.userId) {
      return res.status(400).json({ error: 'Você não pode denunciar a si mesmo.' });
    }

    // Check for duplicate report (same reporter + same target within last 24h)
    const duplicateCheck = await pool.query(
      `SELECT id FROM reports 
       WHERE reporter_id = $1 
       AND (reported_user_id = $2 OR reported_post_id = $3)
       AND created_at >= NOW() - INTERVAL '24 hours'`,
      [req.userId, reportedUserId || null, reportedPostId || null]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Você já denunciou este conteúdo recentemente.' });
    }

    await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.userId, reportedUserId || null, reportedPostId || null, reason, description || null]
    );

    res.status(201).json({ message: 'Denúncia enviada com sucesso. Nossa equipe irá analisar.' });
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: error.message || 'Failed to create report' });
  }
});

export default router;
