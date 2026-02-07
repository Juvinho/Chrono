import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { adminConfig } from '../../config/admin.js';
import { pool } from '../../db/connection.js';

const router = Router();

// POST /api/admin/auth/login - Autentica com senha master
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { password, userId } = req.body;

    // Validação básica
    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        code: 'PASSWORD_REQUIRED',
      });
    }

    // ✅ VERIFICAÇÃO DA SENHA MASTER
    const isValidPassword = adminConfig.verifyMasterPassword(password);

    if (!isValidPassword) {
      // Log de tentativa falhada
      console.warn('🚨 [SECURITY] Failed admin login attempt', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        error: 'Invalid admin password',
        code: 'INVALID_ADMIN_PASSWORD',
      });
    }

    // Busca dados do usuário admin no DB
    const userIdToUse = userId || adminConfig.adminUserId;
    
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
      [userIdToUse]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin user not found',
        code: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];

    // Gera token JWT especial para admin
    const sessionId = crypto.randomUUID();
    
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: true,
        sessionId,
      },
      adminConfig.jwtSecret,
      {
        expiresIn: `${adminConfig.sessionDuration}h`,
      }
    );

    // Log de login bem-sucedido
    console.log('✅ [ADMIN] Successful login', {
      admin: user.username,
      adminId: user.id,
      sessionId,
      timestamp: new Date().toISOString(),
      ip: req.ip,
    });

    // Retorna token e dados do admin
    res.json({
      success: true,
      token,
      admin: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        sessionId,
      },
      expiresIn: adminConfig.sessionDuration * 3600, // Em segundos
    });
  } catch (error) {
    console.error('❌ [ADMIN] Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'ADMIN_LOGIN_ERROR',
    });
  }
});

// POST /api/admin/auth/logout - Encerra sessão admin
router.post('/logout', async (req: Request, res: Response) => {
  // Token expira naturalmente após a duração configurada
  
  console.log('🚪 [ADMIN] Logout', {
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
});

// GET /api/admin/auth/verify - Verifica se token admin é válido
router.get('/verify', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, adminConfig.jwtSecret) as {
      userId: number;
      username: string;
      isAdmin: boolean;
    };

    if (!decoded.isAdmin) {
      return res.status(403).json({ valid: false });
    }

    res.json({
      valid: true,
      admin: {
        id: decoded.userId,
        username: decoded.username,
      },
    });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

export default router;
