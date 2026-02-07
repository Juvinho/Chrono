import { pool } from '../db/connection.js';
import { TAG_IDS } from '../db/tags-seed.js';

interface UserMetrics {
  userId: string;
  totalReacoes: number;
  diasDesdeCriacao: number;
  avisos: number;
  timeStamoCriacao: Date;
}

/**
 * Verificação automática de aquisição/remoção de tags
 * Executada periodicamente por cron job
 */

// ==================== ATUALIZAR TAG: RECÉM-CHEGADO ====================
export async function updateNewcommerTag() {
  try {
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * DAY_IN_MS;

    // Adicionar tag para usuários com conta < 7 dias
    const addResult = await pool.query(
      `INSERT INTO user_tags (user_id, tag_id, ativo, adquirida_em)
       SELECT u.id, $1, true, NOW()
       FROM users u
       WHERE 
         EXTRACT(EPOCH FROM (NOW() - u.created_at)) * 1000 < $2
         AND NOT EXISTS (
           SELECT 1 FROM user_tags ut 
           WHERE ut.user_id = u.id AND ut.tag_id = $1
         )
       ON CONFLICT (user_id, tag_id) DO UPDATE
       SET ativo = true, removida_em = NULL
       WHERE user_tags.ativo = false`,
      [TAG_IDS.RECEM_CHEGADO, SEVEN_DAYS_MS]
    );

    console.log(`✅ Updated Recém-chegado tag: ${addResult.rowCount} users affected`);

    // Remover tag para usuários com conta > 7 dias
    const removeResult = await pool.query(
      `UPDATE user_tags
       SET ativo = false, removida_em = NOW(), motivo_remocao = 'Deixou de ser recém-chegado'
       WHERE tag_id = $1 
         AND ativo = true
         AND user_id IN (
           SELECT u.id FROM users u
           WHERE EXTRACT(EPOCH FROM (NOW() - u.created_at)) * 1000 >= $2
         )`,
      [TAG_IDS.RECEM_CHEGADO, SEVEN_DAYS_MS]
    );

    console.log(`✅ Removed Recém-chegado tag: ${removeResult.rowCount} users affected`);
  } catch (error) {
    console.error('Error updating newcommer tag:', error);
  }
}

// ==================== ATUALIZAR TAG: POPULAR ====================
export async function updatePopularTag() {
  try {
    const REACTION_THRESHOLD = 5000;

    // Adicionar tag para usuários com >= 5000 reações
    const addResult = await pool.query(
      `INSERT INTO user_tags (user_id, tag_id, ativo, adquirida_em)
       SELECT u.id, $1, true, NOW()
       FROM users u
       WHERE 
         (SELECT COALESCE(SUM(j->'value'::text)::integer, 0)
          FROM posts p, jsonb_each(p.reactions) j
          WHERE p.author->'username'::text = to_jsonb(u.username)->'username'::text) >= $2
         AND NOT EXISTS (
           SELECT 1 FROM user_tags ut 
           WHERE ut.user_id = u.id AND ut.tag_id = $1
         )
       ON CONFLICT (user_id, tag_id) DO UPDATE
       SET ativo = true, removida_em = NULL
       WHERE user_tags.ativo = false`,
      [TAG_IDS.POPULAR, REACTION_THRESHOLD]
    );

    console.log(`✅ Updated Popular tag: ${addResult.rowCount} users affected`);
  } catch (error) {
    console.error('Error updating popular tag:', error);
  }
}

// ==================== ATUALIZAR TAG: ADVERTIDO ====================
export async function updateAdvertidoTag() {
  try {
    // Remover tag depois de 60 dias sem infrações adicionais
    const removeResult = await pool.query(
      `UPDATE user_tags
       SET ativo = false, removida_em = NOW(), motivo_remocao = 'Período de advertência expirou'
       WHERE tag_id = $1 
         AND ativo = true
         AND adquirida_em < NOW() - INTERVAL '60 days'`,
      [TAG_IDS.ADVERTIDO]
    );

    console.log(`✅ Removed Advertido tag (expired): ${removeResult.rowCount} users affected`);
  } catch (error) {
    console.error('Error updating advertido tag:', error);
  }
}

// ==================== ATUALIZAR TAG: SILENCIADO ====================
export async function updateSilenciadoTag() {
  try {
    // Remover tag se tempo de silenciamento expirou
    // NOTE: Esta implementação assume que existe campo de end_date de silenciamento
    // Por enquanto, será manual
    console.log('⏭️  Silenciado tag removal is manual');
  } catch (error) {
    console.error('Error updating silenciado tag:', error);
  }
}

// ==================== EXECUTAR TODAS AS ATUALIZAÇÕES ====================
export async function runTagUpdateCycle() {
  console.log('🔄 Starting automatic tag update cycle...');
  
  try {
    await updateNewcommerTag();
    await updatePopularTag();
      await updateAdvertidoTag();
    await updateSilenciadoTag();
    
    console.log('✅ Tag update cycle complete');
  } catch (error) {
    console.error('❌ Error running tag update cycle:', error);
  }
}

// ==================== SCHEDULE AUTOMATIC UPDATES ====================
/**
 * Execute tag updates every 6 hours
 * Call this in your server startup
 */
export function scheduleTagUpdates() {
  // Run once on startup
  runTagUpdateCycle();
  
  // Schedule for every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(runTagUpdateCycle, SIX_HOURS);
  
  console.log('📅 Tag update scheduler initialized (every 6 hours)');
}
