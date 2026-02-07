import crypto from 'crypto';

export const adminConfig = {
  // Senha master (nunca salva no DB, só em .env)
  masterPassword: process.env.ADMIN_MASTER_PASSWORD || '',
  
  // Secret para JWT admin (diferente do JWT normal)
  jwtSecret: process.env.ADMIN_JWT_SECRET || '',
  
  // Duração da sessão (24 horas por padrão)
  sessionDuration: parseInt(process.env.ADMIN_SESSION_DURATION || '24', 10),
  
  // ID do usuário admin principal (para verificação dupla)
  adminUserId: parseInt(process.env.ADMIN_USER_ID || '1', 10),
  
  // Hash da senha master (para comparação segura)
  getMasterPasswordHash(): string {
    return crypto
      .createHash('sha256')
      .update(this.masterPassword)
      .digest('hex');
  },
  
  // Verifica se senha fornecida bate com a master
  verifyMasterPassword(password: string): boolean {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    return hash === this.getMasterPasswordHash();
  },
};

// Validação na inicialização
if (!adminConfig.masterPassword) {
  console.warn('⚠️  ADMIN_MASTER_PASSWORD not set in .env - admin panel disabled');
}

if (!adminConfig.jwtSecret) {
  console.warn('⚠️  ADMIN_JWT_SECRET not set in .env - admin panel disabled');
}

if (adminConfig.masterPassword && adminConfig.jwtSecret) {
  console.log('✅ Admin config loaded successfully');
}
