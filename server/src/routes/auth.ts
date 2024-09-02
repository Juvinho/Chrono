import express from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const userService = new UserService();

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

    // Verify captcha
    if (!captchaVerified) {
      return res.status(400).json({ error: 'Please verify that you are not a robot' });
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

    const user = await userService.createUser(username, email, password, avatar);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      user: {
        ...user,
        email: undefined, // Don't send email in response
      },
      token,
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

    const user = await userService.getUserByUsername(username, true);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get password hash from database
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    
    if (!dbUser.rows[0] || !dbUser.rows[0].password_hash) {
      console.error(`Login failed: No password hash found for user ${username} (ID: ${user.id})`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await userService.verifyPassword(password, dbUser.rows[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
    const user = await userService.getUserById(req.userId);
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

