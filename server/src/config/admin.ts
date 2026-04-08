import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const adminConfig = {
  // Senha master hash (bcrypt, nunca texto claro)
  masterPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  
  // Secret para JWT admin (diferente do JWT normal)
  jwtSecret: process.env.ADMIN_JWT_SECRET || '',
  
  // Duração da sessão (24 horas por padrão)
  sessionDuration: parseInt(process.env.ADMIN_SESSION_DURATION || '24', 10),
  
  // ID do usuário admin principal (para verificação dupla)
  adminUserId: parseInt(process.env.ADMIN_USER_ID || '1', 10),
  
  // Verifica se senha fornecida bate com o hash bcrypt
  verifyMasterPassword: async function(password: string): Promise<boolean> {
    if (!this.masterPasswordHash) return false;
    try {
      return await bcrypt.compare(password, this.masterPasswordHash);
    } catch (err) {
      console.error('Error verifying admin password:', err);
      return false;
    }
  },
};

// Validação na inicialização
if (!adminConfig.masterPasswordHash) {
  console.warn('⚠️  ADMIN_PASSWORD_HASH not set in .env - admin panel disabled');
}

if (!adminConfig.jwtSecret) {
  console.warn('⚠️  ADMIN_JWT_SECRET not set in .env - admin panel disabled');
}

if (adminConfig.masterPasswordHash && adminConfig.jwtSecret) {
  console.log('✅ Admin config loaded successfully');
}
