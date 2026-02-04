import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

// Clean URL: Remove sslmode parameter if present to avoid conflicts with our object config
const cleanDbUrl = rawDbUrl.split('?')[0];

// Sanitize URL for logging (mask password)
const sanitizedUrl = cleanDbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📡 Connecting to database: ${sanitizedUrl}`);

// Create pool config with any to bypass strict typing for 'lookup' property
const poolConfig: any = {
  connectionString: cleanDbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // FORCE IPv4 ONLY - This is the ultimate fix for ENETUNREACH on Render
  // It overrides the default DNS lookup to only return IPv4 addresses.
  lookup: (hostname: string, _options: any, callback: any) => {
    dns.lookup(hostname, { family: 4 }, (err, address, family) => {
      callback(err, address, family);
    });
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 10,
  keepAlive: true,
};

export const pool = new Pool(poolConfig);

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

