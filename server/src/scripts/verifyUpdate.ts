import { pool } from '../db/connection.js';

async function verifyUpdate() {
  try {
    console.log('✅ Verifying user updates...\n');

    const result = await pool.query(`
      SELECT u.username, u.bio, count(ut.id) as tag_count
      FROM users u 
      LEFT JOIN user_tags ut ON u.id = ut.user_id
      GROUP BY u.id, u.username, u.bio
      ORDER BY u.username
    `);

    console.log('Users with tags:');
    result.rows.forEach((row: any) => {
      console.log(`  @${row.username}: ${row.tag_count} tags, bio: "${row.bio?.substring(0, 50)}..."`);
    });

    // Check total tags per tag type
    const tagsResult = await pool.query(`
      SELECT ut.tag_key, td.display_name, count(*) as user_count
      FROM user_tags ut
      JOIN tag_definitions td ON ut.tag_key = td.tag_key
      GROUP BY ut.tag_key, td.display_name
      ORDER BY user_count DESC
    `);

    console.log('\n📊 Tag distribution:');
    tagsResult.rows.forEach((row: any) => {
      console.log(`  - ${row.display_name} (${row.tag_key}): ${row.user_count} users`);
    });

    console.log(`\n✅ Total: ${result.rows.length} users updated`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyUpdate();
