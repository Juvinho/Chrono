import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';
import { getTwoFactorService } from '../services/twoFactorServiceLoader.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const userService = new UserService();

const TWO_FACTOR_UNAVAILABLE_RESPONSE = {
  error: 'Servico 2FA temporariamente indisponivel. Tente novamente em instantes.',
  code: 'TWO_FACTOR_SERVICE_UNAVAILABLE',
};

/**
 * GET /api/auth/2fa/status
 * Check if 2FA is enabled for the current user
 */
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const twoFactorService = await getTwoFactorService();
    if (!twoFactorService) {
      return res.status(503).json(TWO_FACTOR_UNAVAILABLE_RESPONSE);
    }

    const status = await twoFactorService.get2FAStatus(req.userId!);
    res.json({ enabled: status.enabled });
  } catch (error: any) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Generate a new TOTP secret + QR code for the user to scan.
 * Does NOT enable 2FA yet — user must confirm with a code first.
 */
router.post('/setup', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const twoFactorService = await getTwoFactorService();
    if (!twoFactorService) {
      return res.status(503).json(TWO_FACTOR_UNAVAILABLE_RESPONSE);
    }

    const status = await twoFactorService.get2FAStatus(req.userId!);
    if (status.enabled) {
      return res.status(400).json({ error: '2FA já está ativo. Desative primeiro para reconfigurar.' });
    }

    const user = await userService.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const setup = await twoFactorService.generate2FASetup(req.userId!, user.username);

    // Store the secret temporarily (unconfirmed) — we'll encrypt & confirm in /confirm
    // For security, store it encrypted even temporarily
    res.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      secret: setup.secret, // User needs this to add manually to authenticator
      otpauthUrl: setup.otpauthUrl,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA setup' });
  }
});

/**
 * POST /api/auth/2fa/confirm
 * Confirm 2FA setup by verifying the first TOTP code.
 * On success, enables 2FA and returns recovery codes.
 */
router.post('/confirm', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const twoFactorService = await getTwoFactorService();
    if (!twoFactorService) {
      return res.status(503).json(TWO_FACTOR_UNAVAILABLE_RESPONSE);
    }

    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({ error: 'Secret e código são obrigatórios' });
    }

    // Verify the code against the provided secret
    const isValid = twoFactorService.verify2FACode(code, secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Código inválido. Verifique seu aplicativo autenticador e tente novamente.' });
    }

    // Generate recovery codes
    const recoveryCodes = twoFactorService.generateRecoveryCodes();

    // Enable 2FA with encrypted secret and hashed recovery codes
    await twoFactorService.enable2FA(req.userId!, secret, recoveryCodes);

    console.log(`✅ 2FA enabled for user ${req.userId}`);

    // Return recovery codes — this is the ONLY time they're shown in plain text
    res.json({
      success: true,
      message: '2FA ativado com sucesso!',
      recoveryCodes,
    });
  } catch (error: any) {
    console.error('2FA confirm error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA — requires password verification
 */
router.post('/disable', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const twoFactorService = await getTwoFactorService();
    if (!twoFactorService) {
      return res.status(503).json(TWO_FACTOR_UNAVAILABLE_RESPONSE);
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para desativar 2FA' });
    }

    // Verify password
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!dbUser.rows[0]?.password_hash) {
      return res.status(400).json({ error: 'Conta sem senha definida' });
    }

    const isValid = await userService.verifyPassword(password, dbUser.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    await twoFactorService.disable2FA(req.userId!);
    console.log(`🔓 2FA disabled for user ${req.userId}`);

    res.json({ success: true, message: '2FA desativado com sucesso' });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

export default router;
