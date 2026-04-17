import { pool } from '../db/connection.js';
import { UserService } from './userService.js';
import { adminConfig } from '../config/admin.js';
import { validateNoEmojis } from '../utils/validation.js';

const userService = new UserService();

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,50}$/;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeUsername = (username: string): string => username.trim();

/**
 * Creates or binds the secret admin account configured via environment variables.
 * This keeps admin access tied to one dedicated account instead of the first user in DB.
 */
export async function ensureSecretAdminAccount(): Promise<void> {
  const configuredUsername = normalizeUsername(process.env.ADMIN_ACCOUNT_USERNAME || '');
  const configuredEmail = normalizeEmail(process.env.ADMIN_ACCOUNT_EMAIL || '');
  const configuredPassword = process.env.ADMIN_ACCOUNT_PASSWORD || '';

  if (!configuredUsername || !configuredEmail || !configuredPassword) {
    console.warn(
      '[ADMIN BOOTSTRAP] ADMIN_ACCOUNT_USERNAME/ADMIN_ACCOUNT_EMAIL/ADMIN_ACCOUNT_PASSWORD not fully configured. Skipping secret admin account bootstrap.'
    );
    return;
  }

  if (!USERNAME_REGEX.test(configuredUsername)) {
    console.warn('[ADMIN BOOTSTRAP] Invalid ADMIN_ACCOUNT_USERNAME format. Use 3-50 chars: letters, numbers, _ or -.');
    return;
  }

  const emojiValidation = validateNoEmojis(configuredUsername, 'Admin username');
  if (!emojiValidation.valid) {
    console.warn(`[ADMIN BOOTSTRAP] ${emojiValidation.error}`);
    return;
  }

  if (configuredPassword.length < 12) {
    console.warn('[ADMIN BOOTSTRAP] ADMIN_ACCOUNT_PASSWORD is too short. Minimum 12 characters required.');
    return;
  }

  const byUsername = await pool.query(
    `SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [configuredUsername]
  );

  const byEmail = await pool.query(
    `SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [configuredEmail]
  );

  let adminUserId: string | null = null;
  let adminUsername: string | null = null;

  const existingByUsername = byUsername.rows[0] || null;
  const existingByEmail = byEmail.rows[0] || null;

  if (existingByUsername && existingByEmail && existingByUsername.id !== existingByEmail.id) {
    throw new Error(
      '[ADMIN BOOTSTRAP] Username and email map to different users. Resolve this conflict before bootstrapping admin account.'
    );
  }

  if (existingByUsername || existingByEmail) {
    const existing = existingByUsername || existingByEmail;
    adminUserId = String(existing.id);
    adminUsername = String(existing.username);

    console.log(`[ADMIN BOOTSTRAP] Reusing existing admin account @${adminUsername}`);
  } else {
    const created = await userService.createUser(configuredUsername, configuredEmail, configuredPassword, undefined);
    adminUserId = String(created.id);
    adminUsername = created.username;

    console.log(`[ADMIN BOOTSTRAP] Secret admin account created: @${adminUsername}`);
  }

  adminConfig.adminUserId = adminUserId;
  adminConfig.adminUsername = (adminUsername || configuredUsername).toLowerCase();
  adminConfig.adminEmail = configuredEmail;

  console.log(
    `[ADMIN BOOTSTRAP] Admin identity locked to userId=${adminConfig.adminUserId} username=${adminConfig.adminUsername}`
  );
}
