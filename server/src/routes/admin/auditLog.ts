import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { AdminAuditService } from '../../services/auditService.js';

const router = Router();
const auditService = new AdminAuditService(pool);

router.use(requireAdmin);

/**
 * A-09: GET /api/admin/audit-log
 * Retrieve audit logs with optional filtering and pagination
 * 
 * Query parameters:
 *   - admin_id: Filter by admin ID
 *   - action_type: Filter by action type
 *   - resource_type: Filter by resource type
 *   - status: Filter by status (success/failed)
 *   - start_date: ISO date string for start of range
 *   - end_date: ISO date string for end of range
 *   - limit: Items per page (default 50, max 200)
 *   - offset: Pagination offset (default 0)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      admin_id,
      action_type,
      resource_type,
      status,
      start_date,
      end_date,
      limit: limitParam = '50',
      offset: offsetParam = '0'
    } = req.query;

    // Parse and validate parameters
    const limit = Math.min(parseInt(limitParam as string) || 50, 200);
    const offset = Math.max(parseInt(offsetParam as string) || 0, 0);

    const filters: any = { limit, offset };

    if (admin_id) {
      filters.admin_id = parseInt(admin_id as string);
    }

    if (action_type) {
      filters.action_type = action_type as string;
    }

    if (resource_type) {
      filters.resource_type = resource_type as string;
    }

    if (status && ['success', 'failed'].includes(status as string)) {
      filters.status = status as 'success' | 'failed';
    }

    if (start_date) {
      filters.start_date = new Date(start_date as string);
      if (isNaN(filters.start_date.getTime())) {
        return res.status(400).json({ error: 'Invalid start_date format' });
      }
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
      if (isNaN(filters.end_date.getTime())) {
        return res.status(400).json({ error: 'Invalid end_date format' });
      }
    }

    const result = await auditService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('[AuditLog Route] Error retrieving logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * A-09: GET /api/admin/audit-log/stats
 * Get statistics about admin actions
 * 
 * Query parameters:
 *   - admin_id: Optional filter by admin ID
 *   - start_date: Optional ISO date string for start of range
 *   - end_date: Optional ISO date string for end of range
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { admin_id, start_date, end_date } = req.query;

    const filters: any = {};

    if (admin_id) {
      filters.admin_id = parseInt(admin_id as string);
    }

    if (start_date) {
      filters.start_date = new Date(start_date as string);
      if (isNaN(filters.start_date.getTime())) {
        return res.status(400).json({ error: 'Invalid start_date format' });
      }
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
      if (isNaN(filters.end_date.getTime())) {
        return res.status(400).json({ error: 'Invalid end_date format' });
      }
    }

    const stats = await auditService.getAuditStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[AuditLog Route] Error retrieving stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit statistics'
    });
  }
});

export default router;
