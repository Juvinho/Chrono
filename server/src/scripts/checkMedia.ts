import { pool } from '../db/connection.js';

async function checkMedia() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='post_media'
      ORDER BY ordinal_position
    `);

    console.log('post_media columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMedia();
