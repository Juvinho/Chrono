import { pool } from '../db/connection.js';
import { Notification, NotificationType } from '../types/index.js';
import { getIo } from '../socket.js';

export class NotificationService {
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

    // Emit real-time notification
    try {
      const io = getIo();
      
      // Fetch actor details for the notification payload
      const actorResult = await pool.query('SELECT username, avatar FROM users WHERE id = $1', [actorId]);
      const actor = actorResult.rows[0];

      let post = null;
      if (postId) {
          const postResult = await pool.query('SELECT content FROM posts WHERE id = $1', [postId]);
          post = postResult.rows[0];
      }

      const payload = {
          ...notification,
          actor: actor ? { username: actor.username, avatar: actor.avatar } : undefined,
          post: post ? { content: post.content } : undefined
      };

      io.to(userId).emit('new_notification', payload);
    } catch (error) {
      console.error('Failed to emit notification:', error);
    }

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

