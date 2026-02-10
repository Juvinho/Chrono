import { pool } from '../db/connection.js';
import { Notification, NotificationType } from '../types/index.js';
import { EmailService } from './emailService.js';

type NotificationJob = { id: string; userId: string; actorId: string; type: NotificationType; postId?: string; attempts: number };
let jobQueue: NotificationJob[] = [];
let isProcessing = false;

export class NotificationService {
  async startQueueWorker(): Promise<void> {
    const run = async () => {
      if (isProcessing) return;
      isProcessing = true;
      try {
        const job = jobQueue.shift();
        if (!job) return;
        try {
          const userRes = await pool.query('SELECT email, is_verified FROM users WHERE id = $1', [job.userId]);
          const actorRes = await pool.query('SELECT username FROM users WHERE id = $1', [job.actorId]);
          const userEmail = userRes.rows[0]?.email || null;
          const actorUsername = actorRes.rows[0]?.username || 'Chrono';
          // Email notifications are not implemented yet - reserved for future use
          // if (userEmail && process.env.SMTP_USER) {
          //   const emailSvc = new EmailService();
          //   const subject = `Chrono: ${job.type}`;
          //   const text = `${actorUsername} interagiu com você (${job.type}).`;
          //   const html = `<p>${actorUsername} interagiu com você (${job.type}).</p>`;
          //   await emailSvc.sendNotificationEmail(userEmail, subject, html, text);
          // }
          // Placeholder: push notifications will be sent when web-push is available
          // We still query subscriptions to keep queue flow consistent
          const subs = await pool.query('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [job.userId]);
          if (subs.rows.length > 0) {
            // Intentionally no-op if web-push library is not configured
            // This ensures we don't break production while preparing infra
          }
        } catch (err) {
          job.attempts += 1;
          if (job.attempts < 5) {
            jobQueue.push(job);
          }
        }
      } finally {
        isProcessing = false;
      }
    };
    setInterval(run, 1000);
  }

  async createNotification(
    userId: string,
    actorId: string,
    notificationType: NotificationType,
    postId?: string
  ): Promise<Notification | null> {
    // Avoid self-notification
    if (userId === actorId) return null;

    // Aggregation/Deduplication logic:
    // If a notification for the same action already exists (even if read), 
    // update it instead of creating a new one to avoid spam.
    let existingQuery = '';
    let params: any[] = [userId, actorId, notificationType];

    if (notificationType === 'follow') {
        existingQuery = `SELECT id FROM notifications 
                         WHERE user_id = $1 AND actor_id = $2 AND notification_type = $3`;
    } else if (postId) {
        existingQuery = `SELECT id FROM notifications 
                         WHERE user_id = $1 AND actor_id = $2 AND notification_type = $3 AND post_id = $4`;
        params.push(postId);
    }

    if (existingQuery) {
        const existing = await pool.query(existingQuery, params);
        if (existing.rows.length > 0) {
            // Update timestamp and mark as unread to bring it to top and notify again
            await pool.query(
                'UPDATE notifications SET created_at = NOW(), is_read = FALSE WHERE id = $1', 
                [existing.rows[0].id]
            );
            
            // Return the updated notification for real-time emission
            const updated = await pool.query('SELECT * FROM notifications WHERE id = $1', [existing.rows[0].id]);
            return this.mapNotificationFromDb(updated.rows[0]);
        }
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, actor_id, notification_type, post_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, actorId, notificationType, postId || null]
    );

    const notification = this.mapNotificationFromDb(result.rows[0]);

    // Real-time emission removed

    jobQueue.push({ id: notification.id, userId, actorId, type: notificationType, postId, attempts: 0 });

    return notification;
  }

  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => this.mapNotificationFromDb(row));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
  }

  mapNotificationFromDb(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      notificationType: row.notification_type,
      postId: row.post_id,
      read: row.is_read,
      createdAt: row.created_at,
    };
  }
}

