import { pool } from './db/connection.js';

async function cleanupBlankPostsForUser() {
  try {
    console.log('🔍 Procurando usuário @Sus_bacon...');

    // Find user by username
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      ['Sus_bacon']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Usuário @Sus_bacon não encontrado');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`✅ Usuário encontrado: @Sus_bacon (ID: ${userId})`);

    // Find and delete blank posts
    const result = await pool.query(
      `DELETE FROM posts 
       WHERE "authorId" = $1 
       AND (content IS NULL OR TRIM(content) = '')
       RETURNING id, created_at`,
      [userId]
    );

    console.log(`\n✅ ${result.rowCount} post(s) em branco deletado(s):`);
    result.rows.forEach((row: any) => {
      console.log(`   - ID: ${row.id} | Data: ${row.created_at}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

cleanupBlankPostsForUser();
