import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { adminConfig } from '../../config/admin.js';
import { pool } from '../../db/connection.js';

const router = Router();

// POST /api/admin/auth/login - Autentica com senha master
router.post('/login', async (req: Request, res: Response) => {
  // Reject immediately if admin is not configured
  if (!adminConfig.isEnabled()) {
    return res.status(503).json({
      error: 'Admin panel is not configured',
      code: 'ADMIN_DISABLED',
    });
  }

  if (!adminConfig.hasConfiguredIdentity()) {
    return res.status(503).json({
      error: 'Admin identity is not configured',
      code: 'ADMIN_IDENTITY_NOT_CONFIGURED',
    });
  }

  try {
    const { username, password } = req.body;

    const normalizedUsername = String(username || '').trim().toLowerCase();

    // Validação básica
    if (!normalizedUsername) {
      return res.status(400).json({
        error: 'Username required',
        code: 'USERNAME_REQUIRED',
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        code: 'PASSWORD_REQUIRED',
      });
    }

    // ✅ VERIFICAÇÃO DA SENHA MASTER
    const isValidPassword = await adminConfig.verifyMasterPassword(password);

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

    // If username is configured for admin account, enforce it strictly
    if (adminConfig.adminUsername && normalizedUsername !== adminConfig.adminUsername) {
      console.warn('🚨 [SECURITY] Invalid admin username attempt', {
        attemptedUsername: normalizedUsername,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      return res.status(401).json({
        error: 'Invalid admin credentials',
        code: 'INVALID_ADMIN_CREDENTIALS',
      });
    }

    // Busca dados do usuário admin dedicado no DB
    const result = await pool.query(
      'SELECT id, username, display_name, email, avatar FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [normalizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin user not found',
        code: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];

    const expectedIdentity = adminConfig.isExpectedAdminIdentity({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    if (!expectedIdentity) {
      console.warn('🚨 [SECURITY] Admin identity mismatch', {
        configuredIdentity: adminConfig.getAdminIdentityLabel(),
        attemptedUserId: user.id,
        attemptedUsername: user.username,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      return res.status(403).json({
        error: 'Admin identity mismatch',
        code: 'ADMIN_IDENTITY_MISMATCH',
      });
    }

    // Gera token JWT especial para admin
    const sessionId = crypto.randomUUID();
    
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
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
        avatarUrl: user.avatar,
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
      userId: string;
      username: string;
      email?: string;
      isAdmin: boolean;
    };

    if (!decoded.isAdmin) {
      return res.status(403).json({ valid: false });
    }

    if (!adminConfig.isExpectedAdminIdentity({
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    })) {
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
