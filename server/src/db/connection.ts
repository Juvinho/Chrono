// NOTE: dotenv is loaded once in server/src/index.ts before any imports.
// Do NOT call dotenv.config() here — it has already been loaded.
import pg from 'pg';

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

// Remove only the `sslmode` query param to avoid conflicts with our SSL object config,
// while preserving all other query params (connection_limit, etc.)
let cleanDbUrl: string;
try {
  const parsed = new URL(rawDbUrl);
  parsed.searchParams.delete('sslmode');
  cleanDbUrl = parsed.toString();
} catch {
  // Fallback for malformed URLs
  cleanDbUrl = rawDbUrl.split('?')[0];
}

// Sanitize URL for logging (mask password)
const sanitizedUrl = cleanDbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`Connecting to database: ${sanitizedUrl}`);

const isLocal = cleanDbUrl.includes('localhost') || cleanDbUrl.includes('127.0.0.1');

// SEC-04: Respect DB_SSL_REJECT_UNAUTHORIZED env var.
// Railway uses self-signed certs — auto-detect and disable rejection.
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined
  || !!(process.env.DATABASE_URL?.includes('railway'));
const rejectUnauthorized = isRailway
  ? false
  : process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

export const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: isLocal ? false : { rejectUnauthorized },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 20,
  keepAlive: true,
});

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no cliente de banco de dados:', err);
});

