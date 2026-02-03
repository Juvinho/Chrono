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
    // If it's a 'follow', don't create a new one if an unread follow already exists from the same actor
    // If it's a 'reaction' or 'reply', don't create if an unread one already exists for the same actor and post
    let existingQuery = '';
    let params: any[] = [userId, actorId, notificationType];

    if (notificationType === 'follow') {
        existingQuery = `SELECT id FROM notifications 
                         WHERE user_id = $1 AND actor_id = $2 AND notification_type = $3 AND is_read = FALSE`;
    } else if (postId) {
        existingQuery = `SELECT id FROM notifications 
                         WHERE user_id = $1 AND actor_id = $2 AND notification_type = $3 AND post_id = $4 AND is_read = FALSE`;
        params.push(postId);
    }

    if (existingQuery) {
        const existing = await pool.query(existingQuery, params);
        if (existing.rows.length > 0) {
            // Update timestamp of existing notification to bring it to top
            await pool.query('UPDATE notifications SET created_at = NOW() WHERE id = $1', [existing.rows[0].id]);
            return null; 
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

    return result.rows.map((row) => this.mapNotificationFromDb(row));
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
      isRead: row.is_read,
      createdAt: row.created_at,
    };
  }
}

