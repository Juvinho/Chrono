import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(process.cwd(), 'server/src/db/migrations');

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Migrations table ready');

    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration files`);

    for (const file of files) {
      // Check if this migration has already been run
      const result = await pool.query(
        'SELECT * FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`▶️  Running migration: ${file}`);
      
      try {
        await pool.query(sql);
        
        // Record that this migration was executed
        await pool.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        
        console.log(`✅ Completed: ${file}`);
      } catch (error: any) {
        console.error(`❌ Failed to run ${file}:`, error.message);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully!');
    return true;
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export { runMigrations };
