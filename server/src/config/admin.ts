import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const asTrimmed = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeIdentifier = (value?: string | null): string | null => {
  const trimmed = asTrimmed(value);
  return trimmed ? trimmed.toLowerCase() : null;
};

const safeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const adminConfig = {
  // Preferred: bcrypt hash. Backward compatible: ADMIN_MASTER_PASSWORD (plain text in env)
  masterPasswordHash: asTrimmed(process.env.ADMIN_PASSWORD_HASH),
  masterPasswordPlain: asTrimmed(process.env.ADMIN_MASTER_PASSWORD),

  // Secret para JWT admin (diferente do JWT normal) — null = painel desativado
  jwtSecret: asTrimmed(process.env.ADMIN_JWT_SECRET),

  // Duração da sessão (24 horas por padrão)
  sessionDuration: parseInt(process.env.ADMIN_SESSION_DURATION || '24', 10),

  // Identidade exclusiva da conta admin
  adminUserId: asTrimmed(process.env.ADMIN_USER_ID),
  adminUsername: normalizeIdentifier(process.env.ADMIN_ACCOUNT_USERNAME),
  adminEmail: normalizeIdentifier(process.env.ADMIN_ACCOUNT_EMAIL),

  hasConfiguredIdentity(): boolean {
    return !!(this.adminUserId || this.adminUsername || this.adminEmail);
  },

  /** Returns true only when ALL required secrets are present */
  isEnabled(): boolean {
    return !!(this.jwtSecret && (this.masterPasswordHash || this.masterPasswordPlain));
  },

  isExpectedAdminIdentity(identity: { userId?: string | number | null; username?: string | null; email?: string | null }): boolean {
    const userId = identity.userId ? String(identity.userId) : null;
    const username = normalizeIdentifier(identity.username);
    const email = normalizeIdentifier(identity.email);

    if (this.adminUserId && userId !== this.adminUserId) {
      return false;
    }

    if (this.adminUsername && username !== this.adminUsername) {
      return false;
    }

    if (this.adminEmail && email !== this.adminEmail) {
      return false;
    }

    return true;
  },

  // Verifica se senha fornecida bate com o hash bcrypt
  verifyMasterPassword: async function(password: string): Promise<boolean> {
    if (this.masterPasswordHash) {
      try {
        return await bcrypt.compare(password, this.masterPasswordHash);
      } catch (err) {
        console.error('Error verifying admin password hash:', err);
        return false;
      }
    }

    if (this.masterPasswordPlain) {
      return safeEqual(password, this.masterPasswordPlain);
    }

    return false;
  },

  getAdminIdentityLabel(): string {
    if (this.adminUserId) return `id:${this.adminUserId}`;
    if (this.adminUsername) return `username:${this.adminUsername}`;
    if (this.adminEmail) return `email:${this.adminEmail}`;
    return 'not-configured';
  },
};

// Validação na inicialização
if (!adminConfig.masterPasswordHash && !adminConfig.masterPasswordPlain) {
  console.warn('ADMIN_PASSWORD_HASH/ADMIN_MASTER_PASSWORD not set — admin panel disabled');
}
if (!adminConfig.jwtSecret) {
  console.warn('ADMIN_JWT_SECRET not set — admin panel disabled');
}
if (!adminConfig.hasConfiguredIdentity()) {
  console.warn('ADMIN identity not configured (ADMIN_USER_ID or ADMIN_ACCOUNT_USERNAME/EMAIL). Admin login will be blocked.');
}
if (adminConfig.isEnabled()) {
  console.log(`Admin config loaded (identity=${adminConfig.getAdminIdentityLabel()})`);
}
