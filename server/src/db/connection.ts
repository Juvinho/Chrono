import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

// Force Node.js to prefer IPv4 over IPv6. 
// This fixes the ENETUNREACH error on Render when connecting to Supabase.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

// Sanitize URL for logging (mask password)
const sanitizedUrl = rawDbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📡 Connecting to database: ${sanitizedUrl}`);

const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = rawDbUrl.includes('supabase.co') || rawDbUrl.includes('supabase.com');

// Force SSL for Supabase/Production and allow self-signed certificates
const sslConfig = (isProduction || isSupabase) ? { 
  rejectUnauthorized: false,
} : false;

export const pool = new Pool({
  connectionString: rawDbUrl,
  ssl: sslConfig,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 10,
  keepAlive: true,
});

pool.on('error', (err: Error) => {
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

