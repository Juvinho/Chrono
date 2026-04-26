import { pool, queryWithRetry } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const q = (sql: string, params: any[] = []) => queryWithRetry(sql, params);

async function initSchema() {
  try {
    console.log('🗄️ Dropping stale tables...');
    const drops = [
      'DROP TABLE IF EXISTS user_tags_backup CASCADE',
      'DROP TABLE IF EXISTS user_tags CASCADE',
      'DROP TABLE IF EXISTS tag_definitions CASCADE',
      'DROP TABLE IF EXISTS audit_logs CASCADE',
      'DROP TABLE IF EXISTS admin_audit_log CASCADE',
      'DROP TABLE IF EXISTS email_verification_logs CASCADE',
      'DROP TABLE IF EXISTS bookmarks CASCADE',
      'DROP TABLE IF EXISTS reports CASCADE',
    ];
    for (const sql of drops) {
      await q(sql);
      console.log(`  ✓ ${sql.replace('DROP TABLE IF EXISTS ', '').replace(' CASCADE', '')}`);
    }

    console.log('📄 Applying schema.sql...');
    const schemaPath = path.join(__dirname, '../../src/db/schema.sql');
    const schemaRaw = fs.readFileSync(schemaPath, 'utf8');

    // Split by statement and run each one
    const statements = schemaRaw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    let ok = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await q(stmt);
        ok++;
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          skipped++;
        } else {
          console.warn(`  ⚠️ ${err.message?.substring(0, 80)}`);
        }
      }
    }
    console.log(`✅ schema.sql: ${ok} statements applied, ${skipped} skipped (already exist)`);

    console.log('🔧 Adding supplemental tables...');
    const extras = [
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`,
      `CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        reason VARCHAR(100) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        result VARCHAR(20) DEFAULT 'success',
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        metadata JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS email_verification_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_email_ver_logs_user_id ON email_verification_logs(user_id)`,
      `CREATE TABLE IF NOT EXISTS private_conversation_pairs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      )`,
      `CREATE TABLE IF NOT EXISTS message_read_status (
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (message_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`,
    ];

    for (const stmt of extras) {
      try {
        await q(stmt);
      } catch (err: any) {
        if (!err.message?.includes('already exists') && !err.message?.includes('duplicate')) {
          console.warn(`  ⚠️ ${err.message?.substring(0, 80)}`);
        }
      }
    }

    console.log('✅ Supplemental tables done');
    console.log('🎉 Schema initialization complete!');
  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initSchema();
