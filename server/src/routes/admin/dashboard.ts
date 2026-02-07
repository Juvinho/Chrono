import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

router.use(requireAdmin);

// GET /api/admin/dashboard/stats - Estatísticas completas do sistema
router.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch all stats in parallel for better performance
    const [
      usersResult,
      bannedResult,
      verifiedResult,
      postsResult,
      conversationsResult,
      messagesResult,
      tagsResult,
      newUsersResult,
      newPostsResult,
      premiumResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query("SELECT COUNT(*) as total FROM users WHERE is_banned = true"),
      pool.query("SELECT COUNT(*) as total FROM users WHERE is_verified = true"),
      pool.query('SELECT COUNT(*) as total FROM posts'),
      pool.query('SELECT COUNT(*) as total FROM conversations'),
      pool.query('SELECT COUNT(*) as total FROM messages'),
      pool.query('SELECT COUNT(*) as total FROM tags'),
      pool.query("SELECT COUNT(*) as total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"),
      pool.query("SELECT COUNT(*) as total FROM posts WHERE created_at >= NOW() - INTERVAL '7 days'"),
      pool.query("SELECT COUNT(*) as total FROM users WHERE subscription_tier != 'free'"),
    ]);

    // Summary stats
    const totalUsers = parseInt(usersResult.rows[0].total);
    const bannedUsers = parseInt(bannedResult.rows[0].total);
    const verifiedUsers = parseInt(verifiedResult.rows[0].total);
    const totalPosts = parseInt(postsResult.rows[0].total);
    const totalConversations = parseInt(conversationsResult.rows[0].total);
    const totalMessages = parseInt(messagesResult.rows[0].total);
    const totalTags = parseInt(tagsResult.rows[0].total);
    const newUsersThisWeek = parseInt(newUsersResult.rows[0].total);
    const newPostsThisWeek = parseInt(newPostsResult.rows[0].total);
    const premiumUsers = parseInt(premiumResult.rows[0].total);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: totalUsers - bannedUsers,
          banned: bannedUsers,
          verified: verifiedUsers,
          premium: premiumUsers,
          newThisWeek: newUsersThisWeek,
        },
        content: {
          totalPosts,
          newPostsThisWeek,
          totalConversations,
          totalMessages,
        },
        tags: {
          total: totalTags,
        },
        engagement: {
          avgMessagesPerConversation:
            totalConversations > 0
              ? (totalMessages / totalConversations).toFixed(2)
              : 0,
          avgPostsPerUser:
            totalUsers > 0 ? (totalPosts / totalUsers).toFixed(2) : 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

// GET /api/admin/dashboard/activity - Atividade recente
router.get('/activity/recent', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `(
        SELECT 'new_user' as type, u.username, u.created_at as timestamp, u.id
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 'new_post', u.username, p.created_at, p.id
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 'new_conversation', u1.username, c.created_at, c.id
        FROM conversations c
        JOIN users u1 ON c.user1_id = u1.id
        ORDER BY c.created_at DESC
        LIMIT 5
      )
      ORDER BY timestamp DESC
      LIMIT 15`
    );

    res.json({
      success: true,
      activities: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      error: 'Failed to fetch activity',
      message: error.message,
    });
  }
});

export default router;
