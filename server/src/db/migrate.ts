import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function migrate(retries = 3) {
  while (retries > 0) {
    try {
      console.log(`Running database migrations (Attempts left: ${retries})...`);
      
      // 1. Run base schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      await pool.query(schema);
      console.log('✅ Base schema applied.');

      // 2. Run additional migrations
      const migrationsDir = join(__dirname, 'migrations');
      try {
          const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
          
          for (const file of migrationFiles) {
              const migrationContent = readFileSync(join(migrationsDir, file), 'utf-8');
              console.log(`Applying migration: ${file}`);
              await pool.query(migrationContent);
          }
      } catch (e) {
          console.log('No additional migrations folder found or empty.');
      }
      
      console.log('✅ All database migrations completed successfully!');
      return; // Success!
    } catch (error) {
      retries--;
      console.error(`❌ Migration attempt failed. ${retries} retries left.`, error);
      if (retries === 0) throw error;
      // Wait 5s before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

// Only run if executed directly
if (process.argv[1] === __filename) {
    migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

