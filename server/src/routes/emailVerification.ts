import { Router, Request, Response } from 'express';
import { getEmailService } from '../services/emailService.js';
import { pool } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const emailVerificationRouter = Router();

/**
 * GET /api/auth/email-verification/status
 * Get current email verification status for authenticated user
 */
emailVerificationRouter.get(
  '/status',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      const emailService = getEmailService();
      
      if (!emailService) {
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'Email verification service is not available at this time.'
        });
      }
      
      const status = await emailService.getVerificationStatus(userId);
      
      res.json({
        email_verified: status.verified,
        token_expiration: status.tokenExpiration,
        attempts_remaining: status.attemptsRemaining
      });
    } catch (error: any) {
      console.error('❌ Error getting verification status:', error);
      res.status(500).json({
        error: 'Failed to get verification status',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/auth/email-verification/send
 * Send verification email to authenticated user
 */
emailVerificationRouter.post(
  '/send',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      const emailService = getEmailService();
      
      if (!emailService) {
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'Email verification service is not available at this time.'
        });
      }

      // Get user details
      const userResult = await pool.query(
        'SELECT id, username, email, email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Check if already verified
      if (user.email_verified) {
        return res.status(400).json({
          error: 'Email already verified',
          message: 'Your email is already verified. No need to send another verification email.'
        });
      }

      // Get client IP and user agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Send verification email
      await emailService.sendVerificationEmail(user, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Verification email sent successfully',
        email: user.email
      });
    } catch (error: any) {
      console.error('❌ Error sending verification email:', error);
      
      // Check if it's a rate limit error
      if (error.message && error.message.includes('Too many verification emails')) {
        return res.status(429).json({
          error: 'Too many requests',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to send verification email',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/auth/email-verification/resend
 * Resend verification email with rate limiting
 */
emailVerificationRouter.post(
  '/resend',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      const emailService = getEmailService();
      
      if (!emailService) {
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'Email verification service is not available at this time.'
        });
      }

      // Get client IP and user agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Resend verification email (includes rate limit check)
      await emailService.resendVerificationEmail(userId, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Verification email resent successfully'
      });
    } catch (error: any) {
      console.error('❌ Error resending verification email:', error);
      
      if (error.message && error.message.includes('Too many verification emails')) {
        return res.status(429).json({
          error: 'Too many requests',
          message: error.message
        });
      }

      if (error.message && error.message.includes('already verified')) {
        return res.status(400).json({
          error: 'Email already verified',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to resend verification email',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/auth/email-verification/verify/:token
 * Verify email with token from verification link
 * This endpoint doesn't require authentication (user isn't logged in yet)
 */
emailVerificationRouter.get(
  '/verify/:token',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Verification token is required'
        });
      }

      const emailService = getEmailService();
      
      if (!emailService) {
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'Email verification service is not available at this time.'
        });
      }
      const user = await emailService.verifyToken(token);

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'The verification link is invalid or has expired. Please request a new verification email.'
        });
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error: any) {
      console.error('❌ Error verifying email:', error);
      res.status(500).json({
        error: 'Failed to verify email',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/auth/email-verification/verify
 * Alternative endpoint to verify email (POST method for forms)
 */
emailVerificationRouter.post(
  '/verify',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Verification token is required'
        });
      }

      const emailService = getEmailService();
      
      if (!emailService) {
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'Email verification service is not available at this time.'
        });
      }
      
      const user = await emailService.verifyToken(token);

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'The verification link is invalid or has expired. Please request a new verification email.'
        });
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error: any) {
      console.error('❌ Error verifying email:', error);
      res.status(500).json({
        error: 'Failed to verify email',
        message: error.message
      });
    }
  }
);

export default emailVerificationRouter;
