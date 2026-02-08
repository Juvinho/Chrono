import { pool } from '../db/connection.js';

async function inspectReactions() {
  try {
    console.log('📊 Inspecting reactions table schema...\n');

    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'reactions'
      ORDER BY ordinal_position;
    `);

    console.log('✅ reactions columns:');
    columnsResult.rows.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`
      );
    });

    // Check if there's a 'likes' view
    const viewsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public' AND table_name LIKE '%like%';
    `);

    if (viewsResult.rows.length > 0) {
      console.log('\n✅ Views related to likes:');
      viewsResult.rows.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // Check reactions structure
    const sampleResult = await pool.query('SELECT * FROM reactions LIMIT 2;');
    console.log(`\n📝 Sample reactions (${sampleResult.rows.length} found):`);
    console.log(JSON.stringify(sampleResult.rows, null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inspectReactions();
