import { pool } from './connection.js';

/**
 * Migration to add participant_ids column to conversations table
 * This handles the transition from conversation_participants table to array storage
 */
export async function addParticipantIds() {
  try {
    console.log('Adding participant_ids column to conversations...');

    // Check if column already exists
    const checkColumn = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'participant_ids'
      )`
    );

    if (checkColumn.rows[0].exists) {
      console.log('participant_ids column already exists');
      return;
    }

    // Add column
    await pool.query(
      `ALTER TABLE conversations ADD COLUMN participant_ids UUID[] DEFAULT '{}'::UUID[]`
    );

    console.log('Added participant_ids column');

    // Create GIN index for better performance
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON conversations USING GIN(participant_ids)`
    );

    // Migrate data from conversation_participants if it exists
    try {
      const checkTable = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'conversation_participants'
        )`
      );

      if (checkTable.rows[0].exists) {
        console.log('Migrating data from conversation_participants...');

        // For each conversation, collect participants into array
        await pool.query(
          `UPDATE conversations c
           SET participant_ids = (
             SELECT array_agg(DISTINCT user_id)::UUID[]
             FROM conversation_participants cp
             WHERE cp.conversation_id = c.id
           )
           WHERE participant_ids = '{}'::UUID[] OR participant_ids IS NULL`
        );

        console.log('Migration completed successfully');
      }
    } catch (migrationError: any) {
      console.log('No conversation_participants table to migrate (expected):', migrationError.message);
    }
  } catch (error: any) {
    console.error('Error adding participant_ids column:', error.message);
    throw error;
  }
}
