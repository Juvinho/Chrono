import { pool } from '../db/connection.js';

async function inspectThreads() {
  try {
    console.log('📊 Inspecting threads table schema...\n');

    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'threads'
      ORDER BY ordinal_position;
    `);

    console.log('✅ threads columns:');
    columnsResult.rows.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type}`
      );
    });

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inspectThreads();
