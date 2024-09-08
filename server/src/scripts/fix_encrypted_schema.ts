
import { pool } from '../db/connection';

async function fixSchema() {
  console.log('Fixing schema for Encrypted Cords...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add conversation_id to encrypted_cords if missing
    // We also add self_destruct_timer which was missing in the CREATE statement but used in code
    console.log('Updating encrypted_cords table...');
    await client.query(`
      ALTER TABLE encrypted_cords 
      ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS self_destruct_timer INTEGER DEFAULT 60;
    `);

    // 2. Add columns to messages table for encryption/self-destruct
    console.log('Updating messages table...');
    await client.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS delete_at TIMESTAMP;
    `);

    // 3. Create index for cleanup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_delete_at ON messages(delete_at);
    `);

    await client.query('COMMIT');
    console.log('Schema fixed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing schema:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
