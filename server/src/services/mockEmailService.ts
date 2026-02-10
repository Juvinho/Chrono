import { pool } from '../db/connection.js';
import crypto from 'crypto';
import { User } from '../types/index.js';

/**
 * Mock Email Service - Used when real Gmail credentials are not configured
 * Allows testing email verification flow without actually sending emails
 */
export class MockEmailService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * Generate a secure verification token
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Send verification email (mocked version)
   */
  async sendVerificationEmail(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Generate token
      const token = this.generateVerificationToken();
      const hashedToken = this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

      // Store token in database
      await pool.query(
        `UPDATE users 
         SET verification_token = $1, 
             verification_token_expires_at = $2,
             verification_sent_at = CURRENT_TIMESTAMP,
             verification_attempts = 0
         WHERE id = $3`,
        [hashedToken, expiresAt, userId]
      );

      // Log to console (simulating email send)
      const verificationLink = `https://chrono-production-3214.up.railway.app/verify-email/${token}`;
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║           📧 MOCK EMAIL SERVICE - VERIFICATION TOKEN           ║
╠════════════════════════════════════════════════════════════════╣
║ USER:  ${user.username.padEnd(54)} ║
║ EMAIL: ${(user.email || 'N/A').padEnd(54)} ║
║ TOKEN: ${token.substring(0, 54).padEnd(54)} ║
╠════════════════════════════════════════════════════════════════╣
║ VERIFICATION LINK:                                             ║
║ ${verificationLink.substring(0, 60).padEnd(60)} ║
╠════════════════════════════════════════════════════════════════╣
║ NOTE: This is a MOCK service. Real emails are NOT being sent. ║
║ To enable real email sending, configure Gmail credentials.    ║
╚════════════════════════════════════════════════════════════════╝
      `);

      // Log verification event
      await pool.query(
        `INSERT INTO email_verification_logs 
         (user_id, email, token, status, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, user.email, token.substring(0, 20), 'mock_sent', ipAddress || null, userAgent || null]
      );
    } catch (error) {
      console.error('❌ Mock email service error:', error);
      throw error;
    }
  }

  /**
   * Verify token (mocked version works same as real)
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const hashedToken = this.hashToken(token);

      // Find user with this token
      const result = await pool.query(
        `SELECT id, username, email, verification_token_expires_at
         FROM users 
         WHERE verification_token = $1`,
        [hashedToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      // Check if token is expired
      if (new Date() > new Date(user.verification_token_expires_at)) {
        return null;
      }

      // Mark as verified
      await pool.query(
        `UPDATE users 
         SET email_verified = TRUE,
             verification_token = NULL,
             verification_token_expires_at = NULL
         WHERE id = $1`,
        [user.id]
      );

      console.log(`✅ Mock email verification successful for ${user.email}`);

      return user;
    } catch (error) {
      console.error('❌ Mock email verification error:', error);
      return null;
    }
  }

  /**
   * Resend verification email (mocked)
   */
  async resendVerificationEmail(userId: number | string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      // Get user
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Send verification email (mocked)
      await this.sendVerificationEmail(user, ipAddress, userAgent);
    } catch (error) {
      console.error('❌ Resend mock email error:', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId: number | string): Promise<boolean> {
    try {
      const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const result = await pool.query('SELECT email_verified FROM users WHERE id = $1', [id]);
      return result.rows.length > 0 && result.rows[0].email_verified;
    } catch (error) {
      console.error('❌ Check verification error:', error);
      return false;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: number | string): Promise<{
    verified: boolean;
    tokenExpiration?: Date;
    attemptsRemaining: number;
  }> {
    try {
      const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const result = await pool.query(
        `SELECT email_verified, verification_token_expires_at, verification_attempts FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const row = result.rows[0];
      return {
        verified: row.email_verified,
        tokenExpiration: row.verification_token_expires_at ? new Date(row.verification_token_expires_at) : undefined,
        attemptsRemaining: Math.max(0, 3 - (row.verification_attempts || 0))
      };
    } catch (error) {
      console.error('❌ Get verification status error:', error);
      throw error;
    }
  }

  /**
   * Test connection (always succeeds for mock)
   */
  async testConnection(): Promise<boolean> {
    console.log('✅ Mock email service connected successfully');
    return true;
  }
}

// Mock singleton
let mockEmailServiceInstance: MockEmailService | null = null;

export function initializeMockEmailService(): MockEmailService {
  console.log('🔄 Inicializando MockEmailService');
  mockEmailServiceInstance = new MockEmailService();
  return mockEmailServiceInstance;
}

export function getMockEmailService(): MockEmailService | null {
  if (!mockEmailServiceInstance) {
    console.warn('⚠️ Mock email service não foi inicializado');
    return null;
  }
  return mockEmailServiceInstance;
}
