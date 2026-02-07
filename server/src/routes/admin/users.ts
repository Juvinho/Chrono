import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Aplicar middleware de verificação admin em todas as rotas
router.use(requireAdmin);

// GET /api/admin/users - Listar todos os usuários
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        username, 
        display_name, 
        email,
        created_at,
        updated_at,
        COALESCE(is_banned, false) as is_banned,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as post_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as followers_count
      FROM users 
      ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
});

// GET /api/admin/users/:id - Ver detalhes de um usuário
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, 
        username, 
        display_name, 
        email,
        bio,
        avatar_url,
        banner_url,
        created_at,
        updated_at,
        COALESCE(is_banned, false) as is_banned
      FROM users 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    // Buscar relacionados
    const posts = await pool.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [id]);
    const followers = await pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [id]);
    const following = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [id]);
    const conversations = await pool.query('SELECT COUNT(*) FROM conversations WHERE user1_id = $1 OR user2_id = $1', [id]);

    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          posts: parseInt(posts.rows[0].count),
          followers: parseInt(followers.rows[0].count),
          following: parseInt(following.rows[0].count),
          conversations: parseInt(conversations.rows[0].count),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      error: 'Failed to fetch user details',
      message: error.message,
    });
  }
});

// PUT /api/admin/users/:id - Editar usuário
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { display_name, email, bio, is_banned } = req.body;

    // Validar que o usuário existe
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Construir query dinâmica baseado no que foi fornecido
    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;

    if (display_name !== undefined) {
      updateFields.push(`display_name = $${paramCount}`);
      updateValues.push(display_name);
      paramCount++;
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
      paramCount++;
    }

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramCount}`);
      updateValues.push(bio);
      paramCount++;
    }

    if (is_banned !== undefined) {
      updateFields.push(`is_banned = $${paramCount}`);
      updateValues.push(is_banned);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, display_name, email, bio, is_banned, updated_at
    `;

    const result = await pool.query(query, updateValues);

    console.log(`✅ [ADMIN] User ${id} updated by admin`, {
      changes: req.body,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message,
    });
  }
});

// DELETE /api/admin/users/:id - Deletar usuário
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que o usuário existe
    const userCheck = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const username = userCheck.rows[0].username;

    // Deletar usuário (isso vai em cascata conforme as constraints)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    console.log(`✅ [ADMIN] User deleted by admin`, {
      userId: id,
      username,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `User '${username}' deleted successfully`,
      deletedUserId: id,
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
});

// POST /api/admin/users/:id/ban - Banir usuário
router.post('/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET is_banned = true, updated_at = NOW() WHERE id = $1 RETURNING id, username, is_banned',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.log(`🚫 [ADMIN] User banned`, {
      userId: id,
      username: result.rows[0].username,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'User banned successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error banning user:', error);
    res.status(500).json({
      error: 'Failed to ban user',
      message: error.message,
    });
  }
});

// POST /api/admin/users/:id/unban - Desbanir usuário
router.post('/:id/unban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET is_banned = false, updated_at = NOW() WHERE id = $1 RETURNING id, username, is_banned',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.log(`✅ [ADMIN] User unbanned`, {
      userId: id,
      username: result.rows[0].username,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'User unbanned successfully',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error unbanning user:', error);
    res.status(500).json({
      error: 'Failed to unban user',
      message: error.message,
    });
  }
});

// POST /api/admin/users/:id/reset-password - Resetar senha
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    // Hash a nova senha
    const hashedPassword = await bcrypt.hash(new_password, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.log(`🔐 [ADMIN] User password reset`, {
      userId: id,
      username: result.rows[0].username,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: new_password,
      warning: 'Share this password with the user securely',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error.message,
    });
  }
});

// GET /api/admin/users/stats/overview - Estatísticas gerais
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const bannedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE is_banned = true');
    const totalPosts = await pool.query('SELECT COUNT(*) FROM posts');
    const totalConversations = await pool.query('SELECT COUNT(*) FROM conversations');
    const newUsersThisWeek = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
    );

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        bannedUsers: parseInt(bannedUsers.rows[0].count),
        activeUsers: parseInt(totalUsers.rows[0].count) - parseInt(bannedUsers.rows[0].count),
        totalPosts: parseInt(totalPosts.rows[0].count),
        totalConversations: parseInt(totalConversations.rows[0].count),
        newUsersThisWeek: parseInt(newUsersThisWeek.rows[0].count),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

export default router;
