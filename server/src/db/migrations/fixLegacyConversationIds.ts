// Migration helper to convert numeric conversation IDs to valid UUIDs
// Run this once during app initialization to fix legacy data

import { pool } from '../connection.js';

export async function fixLegacyConversationIds() {
  try {
    console.log('🔄 Checking for legacy numeric conversation IDs...');

    // Check for conversations with numeric or invalid IDs
    const result = await pool.query(`
      SELECT id, typeof(id) as id_type, user1_id, user2_id 
      FROM conversations 
      WHERE id::text ~ '^[0-9]+$' 
      OR id::text NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('✅ No legacy conversation IDs found — database is clean');
      return;
    }

    console.warn(`⚠️ Found ${result.rows.length} conversations with legacy IDs:`, result.rows);
    console.warn('Run this SQL migration to fix:');
    console.warn(`
    -- Backup conversations table first!
    ALTER TABLE conversations 
    ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();

    UPDATE conversations 
    SET id_new = uuid_generate_v5(
      '6ba7b815-9dad-11d1-80b4-00c04fd430c8'::uuid,
      CONCAT(LEAST(user1_id, user2_id)::text, '-', GREATEST(user1_id, user2_id)::text)
    );

    UPDATE messages m
    SET conversation_id = c.id_new
    FROM conversations c
    WHERE c.id = m.conversation_id::text::bigint;

    ALTER TABLE conversations DROP CONSTRAINT conversations_pkey CASCADE;
    ALTER TABLE conversations DROP COLUMN id;
    ALTER TABLE conversations RENAME COLUMN id_new TO id;
    ALTER TABLE conversations ADD PRIMARY KEY (id);
    ALTER TABLE messages ADD CONSTRAINT fk_messages_conversations 
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    `);

  } catch (error: any) {
    console.error('❌ Error checking for legacy conversation IDs:', error.message);
    // Don't fail startup if this check fails
  }
}
