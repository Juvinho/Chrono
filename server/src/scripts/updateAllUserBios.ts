import { pool } from '../db/connection.js';
import { UserBioService } from '../services/userBioService.js';

const bioService = new UserBioService();

/**
 * Script para atualizar tags e bios de todos os usuários
 * Execução: npm run update-user-tags
 */
async function updateAllUserBiosAndTags() {
  try {
    console.log('🚀 INICIANDO ATUALIZAÇÃO DE BIOS E TAGS DE TODOS OS USUÁRIOS');
    console.log('═'.repeat(60));

    // Busca todos os usuários
    const usersResult = await pool.query(`
      SELECT id, username, bio
      FROM users
      ORDER BY created_at DESC
    `);

    const users = usersResult.rows;
    console.log(`\n📊 Total de usuários encontrados: ${users.length}`);

    let updated = 0;
    let errors = 0;

    // Processa cada usuário
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;

      try {
        // Atualiza tags
        await bioService.updateUserTags(user.id);
        
        // Gera nova bio automática
        const newBio = await bioService.generateAutoBio(user.id);
        
        // Busca tags atualizadas
        const tags = await bioService.getUserTags(user.id);
        const tagsList = tags.map(t => t.displayName).join(', ');

        console.log(`
${progress} ✅ @${user.username}
   Bio: "${newBio.substring(0, 60)}..."
   Tags: ${tagsList || '(nenhuma tag)'}`);

        updated++;
      } catch (err) {
        console.error(`${progress} ❌ Erro ao processar @${user.username}:`, err);
        errors++;
      }

      // Mostra progresso a cada 10 usuários
      if ((i + 1) % 10 === 0) {
        console.log(`\n⏳ Processados: ${i + 1}/${users.length}`);
      }
    }

    console.log(`
\n${'═'.repeat(60)}
📝 RESULTADO FINAL
${'═'.repeat(60)}
✅ Usuários atualizados: ${updated}
❌ Erros: ${errors}
📊 Total: ${users.length}
${'═'.repeat(60)}\n`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err);
    process.exit(1);
  }
}

// Executa
updateAllUserBiosAndTags();
