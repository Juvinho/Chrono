import { pool } from './db/connection.js';

async function cleanupBlankPosts() {
  try {
    console.log('🔍 Procurando posts em branco do @Sus_bacon...');

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
    const username = userResult.rows[0].username;

    console.log(`✅ Usuário encontrado: @${username} (ID: ${userId})`);

    // Find blank posts (empty content or only whitespace)
    const postsResult = await pool.query(
      `SELECT id, content, created_at FROM posts 
       WHERE "authorId" = $1 
       AND (content IS NULL OR content = '' OR content ~ '^\\s+$')
       ORDER BY created_at DESC`,
      [userId]
    );

    if (postsResult.rows.length === 0) {
      console.log('✅ Nenhum post em branco encontrado!');
      process.exit(0);
    }

    console.log(`📝 Encontrados ${postsResult.rows.length} post(s) em branco:`);
    postsResult.rows.forEach((post: any) => {
      console.log(`   - ID: ${post.id} | Data: ${post.created_at}`);
    });

    // Delete blank posts
    const deleteResult = await pool.query(
      `DELETE FROM posts 
       WHERE "authorId" = $1 
       AND (content IS NULL OR content = '' OR content ~ '^\\s+$')`,
      [userId]
    );

    console.log(`🗑️  ${deleteResult.rowCount} post(s) deletado(s) com sucesso!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao deletar posts:', error);
    process.exit(1);
  }
}

cleanupBlankPosts();
