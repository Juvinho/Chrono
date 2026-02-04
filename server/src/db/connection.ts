import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// --- OPÇÃO NUCLEAR PARA FORÇAR IPv4 ---
// Isso sequestra a função de busca de DNS do Node.js para garantir que 
// ele NUNCA tente usar IPv6, resolvendo o erro ENETUNREACH no Render.
const originalLookup = dns.lookup;
(dns as any).lookup = function(hostname: any, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: options };
  } else if (!options) {
    options = { family: 4 };
  } else {
    options.family = 4;
  }
  return originalLookup.call(this, hostname, options, callback);
};
// ---------------------------------------

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

// Limpa a URL de parâmetros que podem confundir o driver
const cleanDbUrl = rawDbUrl.split('?')[0];

// Log de segurança
const sanitizedUrl = cleanDbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📡 Conectando ao banco (IPv4 Forçado): ${sanitizedUrl}`);

export const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 10,
  keepAlive: true,
});

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no cliente de banco de dados:', err);
  // Não encerra o processo imediatamente para permitir tentativas de reconexão do Pool
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query executada', { text, duration, rows: res.rowCount });
  return res;
};

