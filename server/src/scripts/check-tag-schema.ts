import { pool } from '../db/connection.js';

const r = await pool.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tag_definitions' ORDER BY ordinal_position"
);
console.log('tag_definitions columns:', JSON.stringify(r.rows));

const t = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
);
console.log('All tables:', t.rows.map((r: any) => r.tablename).join(', '));

await pool.end();
