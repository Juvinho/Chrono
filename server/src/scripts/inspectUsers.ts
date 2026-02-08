import { pool } from '../db/connection.js';

async function inspect() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);

    console.log('Users table columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Sample data for a user
    const userResult = await pool.query('SELECT id, followers_count, following_count FROM users LIMIT 1;');
    if (userResult.rows.length > 0) {
      console.log('\nSample user data:');
      console.log(JSON.stringify(userResult.rows[0], null, 2));
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

inspect();
