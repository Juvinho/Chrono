import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';
const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com');

// If using Supabase Pooler (port 6543), some configurations might need specific flags.
// We'll use a more robust SSL config for cloud environments.
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: (isProduction || isSupabase) ? { 
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 60000, // 60s for cloud starts
  idleTimeoutMillis: 30000,
  max: 20,
  // Add keep-alive settings to prevent unexpected termination
  keepalive: true,
  keepaliveInitialDelayMillis: 10000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

