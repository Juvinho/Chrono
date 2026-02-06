import { pool } from './connection.js';

/**
 * Migration to ensure conversations table has all required columns
 * Adds missing columns and ensures proper structure for chat to work
 */
export async function addParticipantIds() {
  try {
    console.log('🔧 Checking conversations table structure...');

    // Check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'conversations'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      console.log('❌ conversations table does not exist yet');
      return;
    }

    // Check and add participant_ids column
    const checkParticipantIds = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'participant_ids'
      )`
    );

    if (!checkParticipantIds.rows[0].exists) {
      console.log('➕ Adding participant_ids column...');
      try {
        await pool.query(
          `ALTER TABLE conversations ADD COLUMN participant_ids UUID[] DEFAULT '{}'::UUID[]`
        );
        console.log('✅ participant_ids column added');
      } catch (e: any) {
        console.error('Error adding participant_ids:', e.message?.substring(0, 100));
      }
    } else {
      console.log('✓ participant_ids column exists');
    }

    // Check and add created_at column if missing
    const checkCreatedAt = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'created_at'
      )`
    );

    if (!checkCreatedAt.rows[0].exists) {
      console.log('➕ Adding created_at column...');
      try {
        await pool.query(
          `ALTER TABLE conversations ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
        );
        console.log('✅ created_at column added');
      } catch (e: any) {
        console.error('Error adding created_at:', e.message?.substring(0, 100));
      }
    } else {
      console.log('✓ created_at column exists');
    }

    // Check and add updated_at column if missing
    const checkUpdatedAt = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'updated_at'
      )`
    );

    if (!checkUpdatedAt.rows[0].exists) {
      console.log('➕ Adding updated_at column...');
      try {
        await pool.query(
          `ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
        );
        console.log('✅ updated_at column added');
      } catch (e: any) {
        console.error('Error adding updated_at:', e.message?.substring(0, 100));
      }
    } else {
      console.log('✓ updated_at column exists');
    }

    // Create GIN index if not exists
    try {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON conversations USING GIN(participant_ids)`
      );
      console.log('✓ GIN index configured');
    } catch (e: any) {
      console.log('ℹ️  GIN index info:', e.message?.substring(0, 80));
    }

    // Try to migrate data from conversation_participants if it exists
    try {
      const checkTable = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'conversation_participants'
        )`
      );

      if (checkTable.rows[0].exists) {
        console.log('🔄 Migrating data from conversation_participants...');
        await pool.query(
          `UPDATE conversations c
           SET participant_ids = (
             SELECT array_agg(DISTINCT user_id)::UUID[]
             FROM conversation_participants cp
             WHERE cp.conversation_id = c.id
           )
           WHERE (participant_ids = '{}'::UUID[] OR participant_ids IS NULL)`
        );
        console.log('✅ Data migration completed');
      }
    } catch (migrationError: any) {
      console.log('ℹ️  Migration note:', migrationError.message?.substring(0, 80));
    }

    console.log('✨ Conversations table structure verified');
  } catch (error: any) {
    console.error('⚠️  Table migration warning:', error.message?.substring(0, 100));
    // Don't throw - let server continue
  }
}
