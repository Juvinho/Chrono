import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminConfig } from '../config/admin.js';

// Interface estendida para incluir dados admin na request
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: number;
        username: string;
        isAdmin: true;
        sessionId: string;
      };
    }
  }
}

// Middleware: Verifica se usuário tem sessão admin ativa
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Pega token do header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verifica token
    const decoded = jwt.verify(token, adminConfig.jwtSecret) as {
      userId: number;
      username: string;
      isAdmin: boolean;
      sessionId: string;
    };

    // Valida que é token admin
    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: 'Admin privileges required',
        code: 'ADMIN_PRIVILEGES_REQUIRED',
      });
    }

    // Adiciona dados admin na request
    req.adminUser = {
      id: decoded.userId,
      username: decoded.username,
      isAdmin: true,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Admin session expired',
        code: 'ADMIN_SESSION_EXPIRED',
      });
    }

    return res.status(401).json({
      error: 'Invalid admin token',
      code: 'INVALID_ADMIN_TOKEN',
    });
  }
}

// Middleware: Log de ações admin (auditoria)
export function logAdminAction(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminUser = req.adminUser;
    
    console.log(`🔐 [ADMIN ACTION] ${action}`, {
      admin: adminUser?.username,
      adminId: adminUser?.id,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    next();
  };
}
