import {
  NobleCryptoPlugin,
  ScureBase32Plugin,
  generateSecret as otpGenerateSecret,
  verifySync as otpVerifySync,
  generateURI as otpGenerateURI,
} from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection.js';

const APP_NAME = 'Chrono';
const RECOVERY_CODE_COUNT = 8;

// Instantiate otplib v13 plugins
const cryptoPlugin = new NobleCryptoPlugin();
const base32Plugin = new ScureBase32Plugin();

// AES-256 encryption for storing the TOTP secret
const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET || '';

function getEncryptionKey(): Buffer {
  // Derive a 32-byte key from the secret
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a new TOTP secret and QR code for the user
 */
export async function generate2FASetup(userId: string, username: string): Promise<{
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}> {
  const secret = otpGenerateSecret({ crypto: cryptoPlugin, base32: base32Plugin });
  const otpauthUrl = otpGenerateURI({ label: username, issuer: APP_NAME, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl, otpauthUrl };
}

/**
 * Verify a TOTP code against a secret
 */
export function verify2FACode(code: string, secret: string): boolean {
  try {
    const result = otpVerifySync({ token: code, secret, crypto: cryptoPlugin, base32: base32Plugin });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate recovery codes (8 random codes, human-readable)
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // Format: XXXX-XXXX (alphanumeric, uppercase)
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

/**
 * Enable 2FA for a user: store encrypted secret + hashed recovery codes
 */
export async function enable2FA(
  userId: string,
  secret: string,
  recoveryCodes: string[]
): Promise<void> {
  const encryptedSecret = encrypt(secret);
  
  // Hash each recovery code with bcrypt for secure storage
  const hashedCodes = await Promise.all(
    recoveryCodes.map(code => bcrypt.hash(code, 10))
  );

  await pool.query(
    `UPDATE users 
     SET two_factor_secret = $1, 
         two_factor_enabled = TRUE, 
         backup_codes = $2
     WHERE id = $3`,
    [encryptedSecret, hashedCodes, userId]
  );
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users 
     SET two_factor_secret = NULL, 
         two_factor_enabled = FALSE, 
         backup_codes = '{}'
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Get 2FA status and encrypted secret for a user
 */
export async function get2FAStatus(userId: string): Promise<{
  enabled: boolean;
  secret: string | null;
}> {
  const result = await pool.query(
    'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return { enabled: false, secret: null };
  }

  const row = result.rows[0];
  let decryptedSecret: string | null = null;

  if (row.two_factor_secret) {
    try {
      decryptedSecret = decrypt(row.two_factor_secret);
    } catch {
      console.error(`[2FA] Failed to decrypt secret for user ${userId}`);
    }
  }

  return {
    enabled: !!row.two_factor_enabled,
    secret: decryptedSecret,
  };
}

/**
 * Verify a recovery code and consume it (one-time use)
 */
export async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT backup_codes FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) return false;

  const hashedCodes: string[] = result.rows[0].backup_codes || [];
  
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code, hashedCodes[i]);
    if (match) {
      // Remove the used code
      const updatedCodes = [...hashedCodes];
      updatedCodes.splice(i, 1);
      
      await pool.query(
        'UPDATE users SET backup_codes = $1 WHERE id = $2',
        [updatedCodes, userId]
      );
      
      return true;
    }
  }

  return false;
}
