
import { pool } from './src/db/connection.js';

async function testConnection() {
  console.log('Testing database connection...');
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0].now);
    
    const tableRes = await client.query("SELECT to_regclass('public.users')");
    console.log('Users table exists:', !!tableRes.rows[0].to_regclass);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

testConnection();
