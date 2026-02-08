import { pool } from '../db/connection.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Starting schema migration...\n');
    
    const sql = fs.readFileSync('./src/db/migrations/fix_user_tags_schema.sql', 'utf8');
    
    // Split by statements and execute each one
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log(`  Executing: ${trimmed.substring(0, 80)}...`);
        try {
          await pool.query(trimmed);
        } catch (err: any) {
          // Some statements may fail if they're idempotent, that's ok
          if (err.message.includes('already exists') || err.message.includes('does not exist')) {
            console.log(`  ⚠️  Warning: ${err.message}`);
          } else {
            throw err;
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
