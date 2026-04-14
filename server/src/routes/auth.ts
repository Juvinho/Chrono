import express from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';
import crypto from 'crypto';
import dns from 'dns';
import net from 'net';
import { promisify } from 'util';

import { validateNoEmojis } from '../utils/validation.js';
import { SecurityService } from '../services/securityService.js';
import { get2FAStatus, verify2FACode, verifyRecoveryCode } from '../services/twoFactorService.js';
import { validateHCaptcha } from '../services/hcaptchaService.js';

// Validate JWT_SECRET - must match the one in middleware/auth.ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Cannot start server.');
}

const resolveMx = promisify(dns.resolveMx);
const router = express.Router();
const userService = new UserService();
const securityService = new SecurityService();

// Helper to check SMTP handshake (deep verification)
const checkSmtp = async (domain: string, email: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
        try {
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return resolve(false);
            }
            
            // Sort by priority
            mxRecords.sort((a, b) => a.priority - b.priority);
            const exchange = mxRecords[0].exchange;

            const socket = net.createConnection(25, exchange);
            let step = 0; 
            // 0: Expect Greeting
            // 1: Expect EHLO response
            // 2: Expect MAIL FROM response
            // 3: Expect RCPT TO response

            socket.setTimeout(5000, () => { // 5s timeout
                socket.destroy();
                // console.log(`[SMTP] Timeout connecting to ${exchange}`);
                resolve(false); 
            });

            socket.on('data', (data) => {
                const response = data.toString();
                // console.log(`[SMTP] ${exchange} << ${response.trim()}`);

                if (response.startsWith('220') && step === 0) {
                    // Greeting received, send EHLO
                    const cmd = `EHLO ${domain}\r\n`;
                    socket.write(cmd);
                    step = 1;
                } else if (response.startsWith('250') && step === 1) {
                    // EHLO accepted, send MAIL FROM (using null sender for bounce/check)
                    const cmd = `MAIL FROM: <>\r\n`;
                    socket.write(cmd);
                    step = 2;
                } else if (response.startsWith('250') && step === 2) {
                    // MAIL FROM accepted, check recipient
                    const cmd = `RCPT TO: <${email}>\r\n`;
                    socket.write(cmd);
                    step = 3;
                } else if ((response.startsWith('250') || response.startsWith('251')) && step === 3) {
                    // Recipient accepted!
                    socket.write('QUIT\r\n');
                    socket.end();
                    resolve(true);
                } else if (step === 3 && (response.startsWith('550') || response.startsWith('551') || response.startsWith('552') || response.startsWith('553'))) {
                    // Recipient rejected (5xx = permanent failure)
                    socket.write('QUIT\r\n');
                    socket.end();
                    resolve(false);
                } else if (step === 3 && response.startsWith('4')) {
                     // Temporary failure (4xx = graylisting/temporary)
                     // Reject to be safe - user can retry if legitimate
                     socket.write('QUIT\r\n');
                     socket.end();
                     resolve(false);
                }
            });

            socket.on('error', (err) => {
                // console.log(`[SMTP] Error connecting to ${exchange}:`, err.message);
                resolve(false);
            });

        } catch (e) {
            // console.log(`[SMTP] Exception checking ${domain}:`, e);
            resolve(false);
        }
    });
};

// Disposable email domains (Expanded List)
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'guerrillamail.com', 
  'yopmail.com', '10minutemail.com', 'sharklasers.com', 'getnada.com',
  'dispostable.com', 'fake-email.com', 'mail.ovh', 'emailondeck.com',
  'temp-mail.org', 'temp-mail.io', 'maildrop.cc'
]);

// Shared validation helpers
const validateEmail = async (email: string) => {
    if (!email) return { valid: false, error: 'Email required' };

    // RFC 5322 compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    const domain = email.split('@')[1];
    
    // Check disposable
    if (DISPOSABLE_DOMAINS.has(domain.toLowerCase())) {
        return { valid: false, error: 'Disposable email addresses are not allowed' };
    }

    // Check DNS MX records and SMTP Handshake
    try {
        const addresses = await resolveMx(domain);
        if (!addresses || addresses.length === 0) {
             return { valid: false, error: 'Invalid email domain (no MX records)' };
        }
        
        // Skip SMTP check - too restrictive and often fails
        // Focus on DNS MX record validation instead
        // const smtpValid = await checkSmtp(domain, email);
        // if (!smtpValid) {
        //      return { valid: false, error: 'Email address does not exist or is invalid' };
        // }
    } catch (err) {
        return { valid: false, error: 'Email validation failed - cannot verify domain' };
    }

    return { valid: true };
};

// Check Username Availability
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) return res.status(400).json({ error: 'Username required' });

    // Explicit Emoji Validation (as requested)
    const emojiValidation = validateNoEmojis(username, 'Nome de usuário');
    if (!emojiValidation.valid) {
        return res.json({ available: false, error: emojiValidation.error });
    }
    
    // Regex validation: Letters, numbers, underscores, hyphens only
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
       return res.json({ available: false, error: 'Username can only contain letters, numbers, underscores, and hyphens.' });
    }

    const user = await userService.getUserByUsername(username);
    if (user) {
        // Suggest alternatives
        const suggestions = [
            `${username}_${Math.floor(Math.random() * 100)}`,
            `${username}${new Date().getFullYear()}`,
            `real_${username}`
        ];
        return res.json({ available: false, error: 'Username already taken', suggestions });
    }

    res.json({ available: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check Email Validity
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const validation = await validateEmail(email);
    
    if (!validation.valid) {
        return res.json(validation);
    }

    // Check if email is already registered
    const existingEmail = await userService.getUserByEmail(email);
    if (existingEmail) {
        return res.json({ valid: false, error: 'Email already registered' });
    }

    res.json({ valid: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar, captchaToken } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validation: Username cannot contain spaces
    if (username.includes(' ')) {
      return res.status(400).json({ error: 'Username cannot contain spaces' });
    }

    // Validation: No emojis in username
    const usernameEmojiValidation = validateNoEmojis(username, 'Nome de usuário');
    if (!usernameEmojiValidation.valid) {
      return res.status(400).json({ error: usernameEmojiValidation.error });
    }
    
    // Rigorous Email Validation
    const emailValidation = await validateEmail(email);
    if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
    }

    // Verify hCaptcha token
    if (!captchaToken) {
      return res.status(400).json({ error: 'hCaptcha token is required' });
    }

    const hcaptchaValid = await validateHCaptcha(captchaToken);
    if (!hcaptchaValid) {
      return res.status(400).json({ error: 'hCaptcha verification failed. Please try again.' });
    }

    // Validation: Prevent registration of system protected usernames
    const systemUsernames = ['juvinho', 'chrono', 'chronobot', 'system', 'admin'];
    if (systemUsernames.includes(username.toLowerCase())) {
      return res.status(400).json({ error: 'This username is reserved by the system.' });
    }

    // Check if user already exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const existingEmail = await userService.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user (email_verified = false by default)
    const user = await userService.createUser(username, email, password, avatar);

    // Send verification email
    try {
      const { getEmailService } = await import('../services/emailService.js');
      const emailService = await getEmailService();
      
      if (emailService) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');
        
        await emailService.sendVerificationEmail(user, ipAddress, userAgent);
        console.log(`✅ Verification email sent to ${email}`);
      } else {
        console.warn(`⚠️ Email service not available. User ${email} needs manual verification.`);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send verification email:', emailError);
      // Don't block registration if email fails, but log it
    }

    // Send welcome email (independent block — never blocks registration)
    try {
      const { getEmailService } = await import('../services/emailService.js');
      const emailService = await getEmailService();
      if (emailService) {
        await emailService.sendWelcomeEmail(user);
      }
    } catch (welcomeEmailError) {
      console.warn('⚠️ Failed to send welcome email:', welcomeEmailError);
    }

    res.status(201).json({
      message: 'Registration successful! Please verify your email to continue.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: false
      },
      nextStep: 'verify_email'
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaToken } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify hCaptcha token
    if (!captchaToken) {
      return res.status(400).json({ error: 'hCaptcha token is required' });
    }

    const hcaptchaValid = await validateHCaptcha(captchaToken);
    if (!hcaptchaValid) {
      return res.status(400).json({ error: 'hCaptcha verification failed. Please try again.' });
    }

    const emojiValidation = validateNoEmojis(username, 'Nome de usuário');
    if (!emojiValidation.valid) {
        return res.status(400).json({ error: emojiValidation.error });
    }

    const user = await userService.getUserByUsername(username, true);
    if (!user) {
      await securityService.logAction(null, 'login', 'user', null, 'failure', { username, reason: 'user_not_found' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check verification status (use email_verified as canonical column)
    const verificationCheck = await pool.query('SELECT email_verified, email FROM users WHERE id = $1', [user.id]);
    if (verificationCheck.rows.length > 0 && !verificationCheck.rows[0].email_verified) {
         await securityService.logAction(user.id, 'login', 'user', user.id, 'failure', { username, reason: 'email_not_verified' }, req);
         return res.status(403).json({ 
           error: 'email_not_verified',
           message: 'Seu email ainda não foi verificado. Verifique sua caixa de entrada.',
           email: verificationCheck.rows[0].email
         });
    }

    // Get password hash from database
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    
    if (!dbUser.rows[0] || !dbUser.rows[0].password_hash) {
      console.error(`Login failed: No password hash found for user ${username} (ID: ${user.id})`);
      await securityService.logAction(user.id, 'login', 'user', user.id, 'failure', { username, reason: 'missing_password_hash' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await userService.verifyPassword(password, dbUser.rows[0].password_hash);

    if (!isValid) {
      await securityService.logAction(user.id, 'login', 'user', user.id, 'failure', { username, reason: 'invalid_password' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ─── 2FA check ───────────────────────────────────────────
    const twoFAStatus = await get2FAStatus(user.id);
    if (twoFAStatus.enabled) {
      // If 2FA is enabled, don't issue the final JWT yet.
      // Issue a short-lived temp token that only permits /auth/verify-2fa
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, purpose: '2fa_pending' },
        JWT_SECRET,
        { expiresIn: '5m' } // 5 minutes to enter 2FA code
      );

      return res.json({
        requires_2fa: true,
        temp_token: tempToken,
      });
    }
    // ─── End 2FA check ───────────────────────────────────────

    await securityService.logAction(user.id, 'login', 'user', user.id, 'success', { username }, req);

    // Update last_seen timestamp
    await userService.updateLastSeen(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    // Set JWT as httpOnly cookie — browser sends it automatically, JS cannot read it
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        ...user,
        email: undefined,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    let errorDetails = error.toString();
    if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
      errorDetails += ' Errors: ' + error.errors.map((e: any) => e.message || e.toString()).join(', ');
    }

    res.status(500).json({ 
      error: error.message || 'Login failed',
      details: errorDetails,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ─── 2FA Verification (during login) ─────────────────────
// Called after login returns requires_2fa: true
router.post('/verify-2fa', async (req, res) => {
  try {
    const { temp_token, code, recovery_code } = req.body;

    if (!temp_token) {
      return res.status(400).json({ error: 'Token temporário é obrigatório' });
    }
    if (!code && !recovery_code) {
      return res.status(400).json({ error: 'Código 2FA ou código de recuperação é obrigatório' });
    }

    // Verify the temp token
    let decoded: any;
    try {
      decoded = jwt.verify(temp_token, JWT_SECRET);
    } catch (err: any) {
      return res.status(401).json({ error: 'Token temporário expirado. Faça login novamente.' });
    }

    if (decoded.purpose !== '2fa_pending') {
      return res.status(401).json({ error: 'Token inválido para verificação 2FA' });
    }

    const userId = decoded.id;
    const username = decoded.username;

    let verified = false;

    if (code) {
      // Verify TOTP code
      const twoFAStatus = await get2FAStatus(userId);
      if (!twoFAStatus.secret) {
        return res.status(500).json({ error: 'Erro interno: secret 2FA não encontrado' });
      }
      verified = verify2FACode(code, twoFAStatus.secret);
    } else if (recovery_code) {
      // Verify recovery code (one-time use)
      verified = await verifyRecoveryCode(userId, recovery_code);
    }

    if (!verified) {
      return res.status(401).json({ error: 'Código inválido. Tente novamente.' });
    }

    // 2FA verified — issue the real JWT
    await securityService.logAction(userId, 'login', 'user', userId, 'success', { username, method: '2fa' }, req);
    await userService.updateLastSeen(userId);

    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const token = jwt.sign(
      { id: userId, username },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        ...user,
        email: undefined,
      },
    });
  } catch (error: any) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Falha na verificação 2FA' });
  }
});

// Verify Email Endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE, is_verified = TRUE, email_verification_token = NULL
       WHERE email_verification_token = $1
       RETURNING id, username, email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    res.json({ message: 'Email verified successfully', user: result.rows[0] });
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email (no auth required - for users who can't login)
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Find user by email
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'Se o email existir, um link de verificação será enviado.' });
    }

    // Check if already verified
    const verCheck = await pool.query('SELECT is_verified, email_verified FROM users WHERE id = $1', [user.id]);
    if (verCheck.rows.length > 0 && (verCheck.rows[0].is_verified || verCheck.rows[0].email_verified)) {
      return res.status(400).json({ error: 'Este email já está verificado. Faça login normalmente.' });
    }

    // Send verification email
    try {
      const { getEmailService } = await import('../services/emailService.js');
      const emailService = await getEmailService();
      
      if (emailService) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');
        
        await emailService.sendVerificationEmail(user, ipAddress, userAgent);
        console.log(`✅ Verification email resent to ${email}`);
      } else {
        console.warn(`⚠️ Email service not available for resend to ${email}`);
      }
    } catch (emailError: any) {
      // Rate limit error
      if (emailError.message && emailError.message.includes('Too many')) {
        return res.status(429).json({ error: 'Muitos emails enviados. Aguarde 1 hora.' });
      }
      console.error('⚠️ Failed to resend verification email:', emailError);
    }

    res.json({ success: true, message: 'Se o email existir, um link de verificação será enviado.' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Erro ao reenviar email de verificação' });
  }
});

// Forgot password — generate a secure token, store hash, send email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always respond the same way to avoid leaking whether an email is registered
    const genericResponse = { message: 'If that email is registered, reset instructions have been sent.' };

    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.json(genericResponse);
    }

    // Generate a random token and store its SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    try {
      const { getEmailService } = await import('../services/emailService.js');
      const emailService = await getEmailService();
      if (emailService) {
        await emailService.sendPasswordResetEmail(user, rawToken);
      }
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
      // Don't expose email errors to caller
    }

    res.json(genericResponse);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Reset password — requires a valid one-time token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()`,
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = result.rows[0].id;

    await userService.updatePassword(userId, newPassword);

    // Invalidate the token immediately after use
    await pool.query(
      'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    // Verify current password
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!dbUser.rows[0] || !dbUser.rows[0].password_hash) {
      return res.status(400).json({ error: 'Conta sem senha definida.' });
    }

    const isValid = await userService.verifyPassword(currentPassword, dbUser.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    await userService.updatePassword(req.userId, newPassword);
    await securityService.logAction(req.userId, 'change_password', 'user', req.userId, 'success', {}, req);

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Falha ao alterar senha.' });
  }
});

// Delete own account
router.delete('/delete-account', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para excluir a conta.' });
    }

    // Verify password
    const dbUser = await pool.query('SELECT password_hash, username FROM users WHERE id = $1', [req.userId]);
    if (!dbUser.rows[0] || !dbUser.rows[0].password_hash) {
      return res.status(400).json({ error: 'Conta sem senha definida.' });
    }

    const isValid = await userService.verifyPassword(password, dbUser.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const username = dbUser.rows[0].username;

    // Log the deletion before actually deleting
    await securityService.logAction(req.userId, 'delete_account', 'user', req.userId, 'success', { username }, req);

    // Delete user (CASCADE will handle posts, bookmarks, etc.)
    await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);

    console.log(`🗑️ User @${username} deleted their own account.`);
    res.json({ success: true, message: 'Conta excluída com sucesso.' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: error.message || 'Falha ao excluir conta.' });
  }
});

// Logout — clear httpOnly cookie
router.post('/logout', (_req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
  res.json({ success: true });
});

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() });
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await userService.getUserById(req.userId!, true);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user,
      email: undefined,
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

export default router;

