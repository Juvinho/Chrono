/**
 * Environment variable loader — MUST be imported as the very first module
 * in the application entry point (index.ts).
 *
 * In ES Modules, static imports are hoisted and execute before any module-level
 * code. By isolating dotenv.config() in a separate module and importing it first,
 * we guarantee that process.env is populated before any other module reads it.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try server/.env first, then root/.env
let envPath = path.join(__dirname, '../.env'); // server/.env
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '../../.env'); // root/.env
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Environment loaded from: ${envPath}`);
} else {
  console.warn('⚠️  No .env file found. Using system environment variables only.');
}
