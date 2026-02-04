import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

// Clean URL: Remove sslmode parameter if present to avoid conflicts with our object config
const cleanDbUrl = rawDbUrl.split('?')[0];

// Sanitize URL for logging (mask password)
const sanitizedUrl = cleanDbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📡 Conectando ao banco de dados: ${sanitizedUrl}`);

const isLocal = cleanDbUrl.includes('localhost') || cleanDbUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: isLocal ? false : {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 20,
  keepAlive: true,
});

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no cliente de banco de dados:', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query executada', { text, duration, rows: res.rowCount });
  return res;
};

