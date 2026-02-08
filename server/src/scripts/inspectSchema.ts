import { pool } from '../db/connection.js';

async function inspectSchema() {
  try {
    console.log('📊 Inspecting user_tags table schema...\n');

    // Check user_tags columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_tags'
      ORDER BY ordinal_position;
    `);

    console.log('✅ user_tags columns:');
    columnsResult.rows.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`
      );
    });

    console.log('\n📊 Inspecting tag_definitions table schema...\n');

    // Check tag_definitions columns
    const tagDefResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'tag_definitions'
      ORDER BY ordinal_position;
    `);

    console.log('✅ tag_definitions columns:');
    tagDefResult.rows.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`
      );
    });

    // Check how many tags are defined
    const tagsCount = await pool.query('SELECT COUNT(*) as count FROM tag_definitions;');
    console.log(`\n✅ Total tags defined: ${tagsCount.rows[0].count}`);

    // Check a sample tag
    const sampleTag = await pool.query('SELECT * FROM tag_definitions LIMIT 1;');
    if (sampleTag.rows.length > 0) {
      console.log('\n📝 Sample tag:');
      console.log(JSON.stringify(sampleTag.rows[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectSchema();
