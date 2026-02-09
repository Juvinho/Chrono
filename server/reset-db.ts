import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database reset...\n');

    // Step 1: Check current posts count
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM posts');
    console.log(`📊 Posts before cleanup: ${beforeCount.rows[0].count}`);

    // Step 2: Delete posts older than 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const deleteOldPosts = await client.query(
      'DELETE FROM posts WHERE created_at < $1 RETURNING id',
      [sixtyDaysAgo]
    );
    console.log(`🗑️  Deleted ${deleteOldPosts.rowCount} posts older than 60 days`);

    // Step 3: Delete duplicate posts (keep newest, delete older duplicates)
    const deleteDuplicates = await client.query(`
      DELETE FROM posts WHERE id IN (
        SELECT id FROM (
          SELECT id, 
            ROW_NUMBER() OVER (PARTITION BY author_id, content ORDER BY created_at DESC) as rn
          FROM posts
        ) t
        WHERE rn > 1
      )
    `);
    console.log(`🗑️  Deleted ${deleteDuplicates.rowCount} duplicate posts`);

    // Step 4: Delete orphaned reactions (to posts that don't exist)
    const deleteOrphanedReactions = await client.query(`
      DELETE FROM reactions WHERE post_id NOT IN (SELECT id FROM posts)
    `);
    console.log(`🗑️  Deleted ${deleteOrphanedReactions.rowCount} orphaned reactions`);

    // Step 5: Delete orphaned replies (to posts that don't exist)
    const deleteOrphanedReplies = await client.query(`
      DELETE FROM posts WHERE in_reply_to_id NOT IN (SELECT id FROM posts) AND in_reply_to_id IS NOT NULL
    `);
    console.log(`🗑️  Deleted ${deleteOrphanedReplies.rowCount} orphaned replies`);

    // Step 6: Check final count
    const afterCount = await client.query('SELECT COUNT(*) as count FROM posts');
    console.log(`\n📊 Posts after cleanup: ${afterCount.rows[0].count}`);
    console.log(`✅ Cleanup complete! Removed ${beforeCount.rows[0].count - afterCount.rows[0].count} posts total\n`);

    // Step 7: Show some recent posts
    const recentPosts = await client.query(`
      SELECT id, author_id, content, created_at 
      FROM posts 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📝 Recent posts (last 5):');
    recentPosts.rows.forEach((p, i) => {
      const date = new Date(p.created_at).toLocaleString();
      console.log(`  ${i+1}. [${date}] ${p.content.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
