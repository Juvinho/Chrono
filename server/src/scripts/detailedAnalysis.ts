import { pool } from '../db/connection.js';

async function detailedAnalysis() {
  try {
    console.log('📊 ANÁLISE DETALHADA DOS USUÁRIOS\n');

    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT p.id) as total_posts,
        COUNT(DISTINCT r.id) FILTER (WHERE r.user_id = u.id AND r.reaction_type = 'Glitch') as likes_given,
        COUNT(DISTINCT r2.id) AS likes_received,
        COUNT(DISTINCT f.follower_id) as followers,
        COUNT(DISTINCT f2.following_id) as following,
        COUNT(DISTINCT CASE WHEN pm.image_id IS NOT NULL THEN pm.post_id END) as posts_with_images,
        COUNT(DISTINCT CASE WHEN pm.video_id IS NOT NULL THEN pm.post_id END) as posts_with_videos
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id
      LEFT JOIN reactions r ON u.id = r.user_id AND r.reaction_type = 'Glitch'
      LEFT JOIN reactions r2 ON p.id = r2.post_id AND r2.reaction_type = 'Glitch'
      LEFT JOIN follows f ON u.id = f.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      LEFT JOIN post_media pm ON p.id = pm.post_id
      GROUP BY u.id, u.username
      ORDER BY u.username
    `);

    console.log('User Statistics:');
    result.rows.forEach((row: any) => {
      console.log(`
@${row.username}:
  - Posts: ${row.total_posts}
  - Likes given: ${row.likes_given}
  - Likes received: ${row.likes_received}
  - Followers: ${row.followers}
  - Following: ${row.following}
  - Posts with images: ${row.posts_with_images}
  - Posts with videos: ${row.posts_with_videos}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

detailedAnalysis();
