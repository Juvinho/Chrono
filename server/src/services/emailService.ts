import nodemailer from 'nodemailer';
import { pool } from '../db/connection.js';
import crypto from 'crypto';
import { User } from '../types/index.js';

export interface EmailServiceConfig {
  gmailUser: string;
  gmailAppPassword: string;
  frontendUrl: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailServiceConfig;
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly VERIFICATION_RATE_LIMIT_MINUTES = 60; // Max 1 email per hour
  private readonly MAX_VERIFICATION_ATTEMPTS = 3;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    
    // Initialize Nodemailer with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmailUser,
        pass: config.gmailAppPassword
      }
    });
  }

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
   * Check if user has already exceeded rate limit for email sends
   */
  async canResendEmail(userId: number | string): Promise<boolean> {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const result = await pool.query(
      `SELECT last_verification_email_sent_at, verification_attempts 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return false;

    const { last_verification_email_sent_at, verification_attempts } = result.rows[0];

    // Check if user has exceeded attempt limit
    if (verification_attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
      console.log(`⚠️ User ${id} exceeded verification attempt limit`);
      return false;
    }

    // Check if rate limit window has passed
    if (!last_verification_email_sent_at) {
      return true;
    }

    const lastSent = new Date(last_verification_email_sent_at);
    const now = new Date();
    const minutesElapsed = (now.getTime() - lastSent.getTime()) / (1000 * 60);

    return minutesElapsed >= this.VERIFICATION_RATE_LIMIT_MINUTES;
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Check rate limit
      if (!(await this.canResendEmail(user.id))) {
        throw new Error(
          `Too many verification emails sent. Please try again in ${this.VERIFICATION_RATE_LIMIT_MINUTES} minutes.`
        );
      }

      // Generate token
      const token = this.generateVerificationToken();
      const hashedToken = this.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      // Save token to database
      await pool.query(
        `UPDATE users 
         SET verification_token = $1,
             verification_token_expires_at = $2,
             verification_sent_at = $3,
             last_verification_email_sent_at = $4,
             verification_attempts = verification_attempts + 1
         WHERE id = $5`,
        [hashedToken, expiresAt, new Date(), new Date(), user.id]
      );

      // Create verification link
      const verificationLink = `${this.config.frontendUrl}/verify-email/${token}`;

      // Generate email HTML
      const emailHTML = this.generateEmailTemplate(user.username, verificationLink);

      // Send email
      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: user.email,
        subject: '✉️ Verifique seu email - Chrono',
        html: emailHTML
      };

      await this.transporter.sendMail(mailOptions);

      // Log email send
      await this.logEmailVerification(
        user.id,
        user.email,
        token,
        'sent',
        ipAddress,
        userAgent
      );

      console.log(`✅ Verification email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      
      // Log error
      if (user.id) {
        await this.logEmailVerification(
          user.id,
          user.email,
          'error-token',
          'failed',
          ipAddress,
          userAgent,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      throw error;
    }
  }

  /**
   * Verify token and mark email as verified
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const hashedToken = this.hashToken(token);
      const now = new Date();

      // Find user with valid token
      const result = await pool.query(
        `SELECT id, username, email, verification_token_expires_at 
         FROM users 
         WHERE verification_token = $1 
         AND verification_token_expires_at > $2 
         AND email_verified = false`,
        [hashedToken, now]
      );

      if (result.rows.length === 0) {
        console.log('❌ Invalid or expired verification token');
        return null;
      }

      const user = result.rows[0];

      // Mark email as verified
      await pool.query(
        `UPDATE users 
         SET email_verified = true,
             verification_token = NULL,
             verification_token_expires_at = NULL,
             verification_attempts = 0
         WHERE id = $1`,
        [user.id]
      );

      // Log verification success
      await this.logEmailVerification(
        user.id,
        user.email,
        token,
        'verified'
      );

      console.log(`✅ Email verified for user ${user.username}`);
      return user;
    } catch (error) {
      console.error('❌ Error verifying token:', error);
      throw error;
    }
  }

  /**
   * Resend verification email with rate limiting
   */
  async resendVerificationEmail(userId: number | string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      // Get user
      const userResult = await pool.query(
        'SELECT id, username, email, email_verified FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check if already verified
      if (user.email_verified) {
        throw new Error('Email is already verified');
      }

      // Send email (includes rate limit check)
      await this.sendVerificationEmail(user, ipAddress, userAgent);
    } catch (error) {
      console.error('❌ Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId: number | string): Promise<boolean> {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 && result.rows[0].email_verified;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: number | string): Promise<{
    verified: boolean;
    tokenExpiration?: Date;
    attemptsRemaining: number;
  }> {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const result = await pool.query(
      `SELECT email_verified, verification_token_expires_at, verification_attempts 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const row = result.rows[0];

    return {
      verified: row.email_verified,
      tokenExpiration: row.verification_token_expires_at,
      attemptsRemaining: this.MAX_VERIFICATION_ATTEMPTS - row.verification_attempts
    };
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(username: string, verificationLink: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifique seu Email - Chrono</title>
    <style>
        @media (prefers-color-scheme: dark) {
            body, .container { background-color: #050505; color: #ffffff; }
            .email-card { background-color: #1a1a1a; border-color: #333; }
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #050505;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            text-align: center;
            padding: 30px 0 20px;
            border-bottom: 2px solid #0084ff;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #0084ff;
            letter-spacing: -1px;
        }
        .email-card {
            background-color: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #050505;
            margin-bottom: 15px;
        }
        .description {
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .cta-button {
            display: inline-block;
            background-color: #0084ff;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .cta-button:hover {
            background-color: #0073e6;
        }
        .alternative-link {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            word-break: break-all;
        }
        .alternative-link a {
            color: #0084ff;
            text-decoration: none;
        }
        .alternative-link a:hover {
            text-decoration: underline;
        }
        .info-box {
            background-color: #f0f7ff;
            border-left: 4px solid #0084ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 12px;
            color: #0084ff;
            text-align: left;
        }
        .footer {
            text-align: center;
            padding: 30px 0 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #999;
        }
        .footer-links {
            margin: 15px 0;
        }
        .footer-links a {
            color: #0084ff;
            text-decoration: none;
            margin: 0 10px;
        }
        .security-note {
            font-size: 11px;
            color: #999;
            margin-top: 20px;
            font-style: italic;
        }
        @media (prefers-color-scheme: dark) {
            .email-card { background-color: #1a1a1a; border-color: #333; }
            .info-box { background-color: #1a3a5c; border-left-color: #0084ff; }
            .footer { border-top-color: #333; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">⏱️ CHRONO</div>
            <p style="margin-top: 8px; color: #666; font-size: 12px;">Rede Social Temporal</p>
        </div>

        <!-- Main Content -->
        <div class="email-card">
            <p class="greeting">👋 Olá, ${username}!</p>
            
            <p class="description">
                Bem-vindo ao Chrono! Para completar seu registro e começar a explorar a rede social temporal, 
                você precisa verificar seu endereço de email.
            </p>

            <p style="margin-bottom: 10px;">Clique no botão abaixo para verificar seu email:</p>
            
            <a href="${verificationLink}" class="cta-button">✓ Verificar Email</a>

            <div class="info-box">
                💡 Este link expira em 24 horas. Se você não solicitou este email, ignore esta mensagem.
            </div>

            <div class="alternative-link">
                <p>Ou copie e cole este link no seu navegador:</p>
                <p><a href="${verificationLink}">${verificationLink}</a></p>
            </div>
        </div>

        <!-- Features -->
        <div style="text-align: center; padding: 20px 0; color: #666; font-size: 13px;">
            <p style="margin: 10px 0;"><strong>🌍 Explore</strong> - Viaje através das 24 horas</p>
            <p style="margin: 10px 0;"><strong>🔗 Conecte</strong> - Faça amigos em qualquer momento</p>
            <p style="margin: 10px 0;"><strong>⏳ Descubra</strong> - Conteúdo que dura 24 horas</p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin-bottom: 15px;">© 2026 Chrono - Rede Social Temporal</p>
            
            <div class="footer-links">
                <a href="https://chrono.com">Site</a> •
                <a href="https://chrono.com/help">Ajuda</a> •
                <a href="https://chrono.com/privacy">Privacidade</a> •
                <a href="https://chrono.com/terms">Termos</a>
            </div>

            <p class="security-note">
                ⚠️ Nunca compartilhe este link com ninguém. Use-o apenas uma vez para verificar sua conta.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Log email verification events for audit trail
   */
  private async logEmailVerification(
    userId: number | string,
    email: string,
    token: string,
    status: 'sent' | 'verified' | 'expired' | 'failed',
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      await pool.query(
        `INSERT INTO email_verification_logs 
         (user_id, email, token, verified_at, status, ip_address, user_agent, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          email,
          token.substring(0, 20), // Store only first 20 chars for security
          status === 'verified' ? new Date() : null,
          status,
          ipAddress || null,
          userAgent || null,
          errorMessage || null
        ]
      );
    } catch (error) {
      console.error('Error logging email verification:', error);
      // Don't throw, just log
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect email service:', error);
      return false;
    }
  }
}

// Export singleton instance
let emailServiceInstance: EmailService | null = null;

export function initializeEmailService(config: EmailServiceConfig): EmailService {
  emailServiceInstance = new EmailService(config);
  return emailServiceInstance;
}

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    throw new Error('Email service not initialized. Call initializeEmailService first.');
  }
  return emailServiceInstance;
}

