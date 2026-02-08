import { pool } from '../db/connection.js';

async function listTables() {
  try {
    console.log('📊 Listing all tables in the database...\n');

    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('✅ Available tables:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    console.log(`\n📝 Total tables: ${result.rows.length}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listTables();
