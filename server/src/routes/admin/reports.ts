import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { AdminAuditService } from '../../services/auditService.js';

const router = Router();
const auditService = new AdminAuditService(pool);

router.use(requireAdmin);

const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
type ReportStatus = (typeof REPORT_STATUSES)[number];

const isReportStatus = (value: string): value is ReportStatus => {
  return REPORT_STATUSES.includes(value as ReportStatus);
};

// GET /api/admin/reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

    const params: any[] = [];
    const where: string[] = [];

    if (statusFilter !== 'all') {
      if (!isReportStatus(statusFilter)) {
        return res.status(400).json({ error: 'Invalid report status filter' });
      }
      params.push(statusFilter);
      where.push(`r.status = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT
        r.id,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        r.reviewed_at,

        reporter.id AS reporter_id,
        reporter.username AS reporter_username,
        COALESCE(reporter.display_name, reporter.username) AS reporter_display_name,

        ru.id AS reported_user_id,
        ru.username AS reported_user_username,
        COALESCE(ru.display_name, ru.username) AS reported_user_display_name,
        COALESCE(ru.is_banned, false) AS reported_user_is_banned,

        p.id AS reported_post_id,
        p.content AS reported_post_content,
        p.author_id AS reported_post_author_id,
        p_author.username AS reported_post_author_username,

        reviewer.id AS reviewer_id,
        reviewer.username AS reviewer_username
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users ru ON ru.id = r.reported_user_id
      LEFT JOIN posts p ON p.id = r.reported_post_id
      LEFT JOIN users p_author ON p_author.id = p.author_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
      ${whereClause}
      ORDER BY
        CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
        r.created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    const reports = result.rows.map((row: any) => ({
      id: row.id,
      reason: row.reason,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      reporter: {
        id: row.reporter_id,
        username: row.reporter_username,
        display_name: row.reporter_display_name,
      },
      reported_user: row.reported_user_id
        ? {
            id: row.reported_user_id,
            username: row.reported_user_username,
            display_name: row.reported_user_display_name,
            is_banned: row.reported_user_is_banned,
          }
        : null,
      reported_post: row.reported_post_id
        ? {
            id: row.reported_post_id,
            content: row.reported_post_content,
            author_id: row.reported_post_author_id,
            author_username: row.reported_post_author_username,
          }
        : null,
      reviewed_by: row.reviewer_id
        ? {
            id: row.reviewer_id,
            username: row.reviewer_username,
          }
        : null,
    }));

    res.json({
      success: true,
      reports,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reports for admin:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      message: error.message,
    });
  }
});

// GET /api/admin/reports/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [statusRows, reasonRows] = await Promise.all([
      pool.query('SELECT status, COUNT(*)::int AS total FROM reports GROUP BY status'),
      pool.query('SELECT reason, COUNT(*)::int AS total FROM reports GROUP BY reason'),
    ]);

    const byStatus: Record<string, number> = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };

    let total = 0;
    for (const row of statusRows.rows) {
      byStatus[row.status] = Number(row.total) || 0;
      total += Number(row.total) || 0;
    }

    const byReason: Record<string, number> = {};
    for (const row of reasonRows.rows) {
      byReason[row.reason] = Number(row.total) || 0;
    }

    res.json({
      success: true,
      stats: {
        total,
        byStatus,
        byReason,
      },
    });
  } catch (error: any) {
    console.error('Error fetching report stats for admin:', error);
    res.status(500).json({ error: 'Failed to fetch report stats', message: error.message });
  }
});

// PATCH /api/admin/reports/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const reportId = String(req.params.id || '');
    const nextStatus = String(req.body?.status || '').toLowerCase();
    const adminId = String(req.adminUser?.id || '');

    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    if (!isReportStatus(nextStatus)) {
      return res.status(400).json({ error: 'Invalid report status' });
    }

    const currentResult = await pool.query('SELECT id, status, reviewed_by FROM reports WHERE id = $1::uuid', [reportId]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const current = currentResult.rows[0];

    const shouldMarkReviewed = nextStatus !== 'pending';

    const updateResult = await pool.query(
      `UPDATE reports
       SET status = $1,
           reviewed_at = CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
           reviewed_by = CASE WHEN $2::boolean THEN $3::uuid ELSE NULL END
       WHERE id = $4::uuid
       RETURNING id, status, reviewed_at, reviewed_by`,
      [nextStatus, shouldMarkReviewed, adminId, reportId]
    );

    try {
      await auditService.logAction({
        admin_id: adminId,
        action_type: 'update_settings',
        resource_type: 'report',
        resource_id: reportId,
        resource_name: `Report ${reportId}`,
        old_value: { status: current.status, reviewed_by: current.reviewed_by },
        new_value: updateResult.rows[0],
        reason: `Report status changed to ${nextStatus}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || undefined,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[ADMIN] Failed to write report status audit log:', auditErr);
    }

    res.json({
      success: true,
      report: updateResult.rows[0],
      message: `Report marked as ${nextStatus}`,
    });
  } catch (error: any) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      error: 'Failed to update report status',
      message: error.message,
    });
  }
});

export default router;
