import { pool } from '../db/connection.js';

export class SecurityService {
    async logAction(userId: string | null, action: string, resource: string, resourceId: string | null, status: 'success' | 'failure', details: any, req: any) {
        try {
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];

            await pool.query(
                `INSERT INTO audit_logs (user_id, action, resource, resource_id, status, ip_address, user_agent, details)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, action, resource, resourceId, status, ipAddress, userAgent, JSON.stringify(details)]
            );
        } catch (error) {
            console.error('Failed to log audit action:', error);
        }
    }

    async getAuditLogs(userId: string, limit: number = 50) {
        const result = await pool.query(
            `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }
}
