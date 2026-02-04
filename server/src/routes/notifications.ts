import express, { Response } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { UserService } from '../services/userService.js';
import { PostService } from '../services/postService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const notificationService = new NotificationService();
const userService = new UserService();
const postService = new PostService();

// Get notifications
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await notificationService.getNotifications(req.userId);

    // Enrich with actor and post info
    const enriched = await Promise.all(
      notifications.map(async (notif: any) => {
        const actor = await userService.getUserById(notif.actorId);
        let post = null;
        if (notif.postId) {
          const postData = await postService.getPostById(notif.postId);
          if (postData) {
            const author = await userService.getUserById(postData.authorId);
            post = {
              id: postData.id,
              content: postData.content,
              author: author
                ? {
                    username: author.username,
                    avatar: author.avatar,
                  }
                : null,
            };
          }
        }

        return {
          ...notif,
          actor: actor
            ? {
                username: actor.username,
                avatar: actor.avatar,
                bio: actor.bio,
              }
            : null,
          post,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id, req.userId!);
    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.userId!);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark all as read' });
  }
});

// Register Web Push subscription (server-side storage)
router.post('/push/subscribe', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.userId, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to store push subscription:', err);
    res.status(500).json({ error: 'Failed to store subscription' });
  }
});

// Unregister Web Push subscription
router.post('/push/unsubscribe', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body || {};
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!endpoint) return res.status(400).json({ error: 'Invalid subscription endpoint' });
    await pool.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [req.userId, endpoint]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to remove push subscription:', err);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

export default router;

