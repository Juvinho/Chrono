import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Validate JWT_SECRET at module load time
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Cannot start server.');
}

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

/**
 * Extract JWT from request:
 * 1. httpOnly cookie 'token' (primary — secure)
 * 2. Authorization: Bearer header (fallback — for mobile/external clients)
 */
function extractToken(req: Request): string | null {
  // 1. httpOnly cookie (set by login)
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // 2. Authorization header fallback
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    req.username = user.username;
    next();
  });
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err) {
      req.userId = user.id;
      req.username = user.username;
    }
    // If token is invalid, we just proceed as guest
    next();
  });
};

