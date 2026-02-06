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
                    // Recipient rejected
                    socket.write('QUIT\r\n');
                    socket.end();
                    resolve(false);
                } else if (response.startsWith('4')) {
                     // Temporary failure, treat as valid to avoid blocking legit users on graylisting
                     socket.write('QUIT\r\n');
                     socket.end();
                     resolve(true);
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
        
        // Use expanded checkSmtp
        const smtpValid = await checkSmtp(domain, email);
        if (!smtpValid) {
             console.warn(`[SMTP] Validation failed for ${email}, but allowing anyway for Alpha.`);
             // return { valid: false, error: 'Invalid email (address rejected by server or unreachable)' };
        }
    } catch (err) {
        console.warn(`[DNS] MX lookup failed for ${domain}, allowing anyway for Alpha.`);
        // return { valid: false, error: 'Invalid email domain (DNS lookup failed)' };
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
    const { username, email, password, avatar, captchaVerified } = req.body;

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

    // Verify captcha
    if (!captchaVerified) {
      return res.status(400).json({ error: 'Please verify that you are not a robot' });
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

    // For Alpha/Development: Auto-verify all new accounts
    const user = await userService.createUser(username, email, password, avatar);
    await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [user.id]);

    res.status(201).json({
      message: 'Registration successful. Welcome to Chrono Alpha!',
      user: {
        username: user.username,
        email: user.email 
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
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

    // Check verification status
    const verificationCheck = await pool.query('SELECT is_verified FROM users WHERE id = $1', [user.id]);
    if (verificationCheck.rows.length > 0 && !verificationCheck.rows[0].is_verified) {
         await securityService.logAction(user.id, 'login', 'user', user.id, 'failure', { username, reason: 'email_not_verified' }, req);
         return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
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

    await securityService.logAction(user.id, 'login', 'user', user.id, 'success', { username }, req);

    // Update last_seen timestamp
    await userService.updateLastSeen(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      user: {
        ...user,
        email: undefined,
      },
      token,
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

// Verify Email Endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const result = await pool.query(
      'UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, username, email',
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

// Reset password request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, password reset instructions sent' });
    }

    // In production, send email with reset token
    // For now, just return success
    res.json({ message: 'Password reset instructions sent (if email exists)' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message || 'Request failed' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userService.updatePassword(user.id, newPassword);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Password reset failed' });
  }
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

