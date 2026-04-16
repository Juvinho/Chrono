import { Pool, QueryResult } from 'pg';

/**
 * A-09: Admin Audit Logging Service
 * Manages logging of all administrative actions for compliance tracking.
 */

export interface AuditLogEntry {
  id?: number;
  admin_id: string | number;
  action_type:
    | 'ban_user'
    | 'unban_user'
    | 'delete_post'
    | 'delete_comment'
    | 'remove_media'
    | 'update_tags'
    | 'update_settings'
    | 'verify_user'
    | 'unverify_user'
    | 'set_admin'
    | 'revoke_admin'
    | 'suspend_account'
    | 'restore_account'
    | 'edit_post_content'
    | 'create_announcement'
    | 'update_announcement'
    | 'delete_announcement';
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  old_value?: any;
  new_value?: any;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed';
  error_message?: string;
  metadata?: any;
}

const parseJsonField = (value: any) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export class AdminAuditService {
  constructor(private pool: Pool) {}

  /**
   * Log an administrative action
   */
  async logAction(entry: AuditLogEntry): Promise<number> {
    const query = `
      INSERT INTO admin_audit_log (
        admin_id, action_type, resource_type, resource_id, resource_name,
        old_value, new_value, reason, ip_address, user_agent,
        status, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;

    const values = [
      String(entry.admin_id),
      entry.action_type,
      entry.resource_type,
      entry.resource_id || null,
      entry.resource_name || null,
      entry.old_value ? JSON.stringify(entry.old_value) : null,
      entry.new_value ? JSON.stringify(entry.new_value) : null,
      entry.reason || null,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.status,
      entry.error_message || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ];

    try {
      const result: QueryResult = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[AuditService] Failed to log action:', error);
      throw error;
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  async getAuditLogs(filters: {
    admin_id?: string;
    action_type?: string;
    resource_type?: string;
    status?: 'success' | 'failed';
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    logs: any[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.admin_id) {
      whereConditions.push(`admin_id = $${paramIndex}`);
      values.push(filters.admin_id);
      paramIndex++;
    }

    if (filters.action_type) {
      whereConditions.push(`action_type = $${paramIndex}`);
      values.push(filters.action_type);
      paramIndex++;
    }

    if (filters.resource_type) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      values.push(filters.resource_type);
      paramIndex++;
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.start_date) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      values.push(filters.end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM admin_audit_log ${whereClause}`;
    const countResult: QueryResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT
        aal.id,
        aal.admin_id,
        admin.username as admin_username,
        admin.display_name as admin_display_name,
        aal.action_type,
        aal.resource_type,
        aal.resource_id,
        aal.resource_name,
        aal.old_value,
        aal.new_value,
        aal.reason,
        aal.ip_address,
        aal.status,
        aal.error_message,
        aal.metadata,
        aal.created_at
      FROM admin_audit_log aal
      LEFT JOIN users admin ON admin.id::text = aal.admin_id
      ${whereClause}
      ORDER BY aal.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    try {
      const result: QueryResult = await this.pool.query(query, values);
      const logs = result.rows.map((row) => ({
        ...row,
        old_value: parseJsonField(row.old_value),
        new_value: parseJsonField(row.new_value),
        metadata: parseJsonField(row.metadata),
      }));

      return {
        logs,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('[AuditService] Failed to retrieve logs:', error);
      throw error;
    }
  }

  /**
   * Get statistics about admin actions
   */
  async getAuditStats(filters: {
    admin_id?: string;
    start_date?: Date;
    end_date?: Date;
  } = {}): Promise<{
    total_actions: number;
    by_type: Record<string, number>;
    success_rate: number;
    by_admin: Record<string, number>;
  }> {
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.admin_id) {
      whereConditions.push(`admin_id = $${paramIndex}`);
      values.push(filters.admin_id);
      paramIndex++;
    }

    if (filters.start_date) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      values.push(filters.end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as total,
        action_type,
        admin_id,
        (CASE WHEN status = 'success' THEN 1 ELSE 0 END) as is_success
      FROM admin_audit_log
      ${whereClause}
      GROUP BY action_type, admin_id, is_success
    `;

    try {
      const result: QueryResult = await this.pool.query(query, values);

      const stats = {
        total_actions: 0,
        by_type: {} as Record<string, number>,
        by_admin: {} as Record<string, number>,
        success_count: 0,
        total_count: 0,
      };

      result.rows.forEach((row) => {
        const count = Number(row.total) || 0;
        const adminId = String(row.admin_id);
        const isSuccess = Number(row.is_success) === 1;

        stats.total_count += count;
        if (isSuccess) stats.success_count += count;

        stats.by_type[row.action_type] = (stats.by_type[row.action_type] || 0) + count;
        stats.by_admin[adminId] = (stats.by_admin[adminId] || 0) + count;
      });

      stats.total_actions = stats.total_count;

      return {
        total_actions: stats.total_actions,
        by_type: stats.by_type,
        success_rate: stats.total_count > 0 ? (stats.success_count / stats.total_count) * 100 : 0,
        by_admin: stats.by_admin,
      };
    } catch (error) {
      console.error('[AuditService] Failed to get stats:', error);
      throw error;
    }
  }
}
