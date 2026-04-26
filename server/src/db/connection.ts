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

const DB_QUERY_RETRY_ATTEMPTS = Math.max(1, Number(process.env.DB_QUERY_RETRY_ATTEMPTS || 3));
const DB_QUERY_RETRY_DELAY_MS = Math.max(100, Number(process.env.DB_QUERY_RETRY_DELAY_MS || 300));

const TRANSIENT_DB_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
]);

const TRANSIENT_DB_MESSAGE_SNIPPETS = [
  'timed out',
  'timeout',
  'connection terminated',
  'could not connect',
  'connection refused',
  'enetunreach',
  'econnrefused',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isTransientDbError(error: any): boolean {
  const code = String(error?.code || '').toUpperCase();
  if (TRANSIENT_DB_ERROR_CODES.has(code)) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return TRANSIENT_DB_MESSAGE_SNIPPETS.some((snippet) => message.includes(snippet));
}

// SSL_OP_LEGACY_SERVER_CONNECT — needed for Node.js v22+/OpenSSL 3 compat with older PostgreSQL TLS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SSL_OP_LEGACY = (() => { try { return require('node:constants').SSL_OP_LEGACY_SERVER_CONNECT; } catch { return 0; } })();

export const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: isLocal ? false : { rejectUnauthorized, secureOptions: SSL_OP_LEGACY },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 15000,
  max: 20,
  keepAlive: true,
});

export async function queryWithRetry(text: string, params: any[] = [], maxAttempts = DB_QUERY_RETRY_ATTEMPTS): Promise<any> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error: any) {
      lastError = error;
      const isTransient = isTransientDbError(error);

      if (!isTransient || attempt >= maxAttempts) {
        throw error;
      }

      const retryDelay = DB_QUERY_RETRY_DELAY_MS * attempt;
      console.warn(
        `[DB] Transient query failure (attempt ${attempt}/${maxAttempts}): ${error?.code || error?.message}. Retrying in ${retryDelay}ms.`
      );
      await sleep(retryDelay);
    }
  }

  throw lastError;
}

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no cliente de banco de dados:', err);
});

