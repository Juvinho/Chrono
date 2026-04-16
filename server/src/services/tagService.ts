import { pool } from '../db/connection.js';

const NEWCOMER_TAG_KEY = 'newcomer';
const POPULAR_TAG_KEY = 'popular';
const WARNED_TAG_KEY = 'warned';

/**
 * Verificação automática de aquisição/remoção de tags
 * Executada periodicamente por cron job
 *
 * Produção: user_tags usa (user_id UUID, tag_key VARCHAR, earned_at TIMESTAMP)
 * sem coluna ativo/adquirida_em (schema fix_user_tags_schema.sql)
 */

// Garante que as tag_definitions necessárias existem antes de atribuir tags
async function ensureTagDefinitions() {
  const required = [
    { tag_key: 'newcomer',  display_name: 'Recém-chegado', description: 'Conta com menos de 7 dias', color: '#2ecc71', icon: '🌱', tag_type: 'badge', display_order: 60 },
    { tag_key: 'popular',   display_name: 'Popular',       description: 'Conteúdo amplamente apreciado (≥5000 reações)', color: '#FF6B9D', icon: '⭐', tag_type: 'achievement', display_order: 50 },
    { tag_key: 'warned',    display_name: 'Advertido',     description: 'Usuário com advertência ativa', color: '#e67e22', icon: '⚠️', tag_type: 'moderation', display_order: 70 },
  ];

  for (const tag of required) {
    await pool.query(
      `INSERT INTO tag_definitions (tag_key, display_name, description, color, icon, tag_type, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tag_key) DO NOTHING`,
      [tag.tag_key, tag.display_name, tag.description, tag.color, tag.icon, tag.tag_type, tag.display_order]
    );
  }
}

// ==================== ATUALIZAR TAG: RECÉM-CHEGADO ====================
export async function updateNewcommerTag() {
  try {
    // Adicionar tag para usuários com conta < 7 dias
    const addResult = await pool.query(
      `INSERT INTO user_tags (user_id, tag_key, earned_at)
       SELECT u.id, $1::varchar, NOW()
       FROM users u
       WHERE u.created_at > NOW() - INTERVAL '7 days'
         AND NOT EXISTS (
           SELECT 1 FROM user_tags ut
           WHERE ut.user_id = u.id AND ut.tag_key = $2::varchar
         )
       ON CONFLICT (user_id, tag_key) DO NOTHING`,
      [NEWCOMER_TAG_KEY, NEWCOMER_TAG_KEY]
    );

    console.log(`✅ Updated Recém-chegado tag: ${addResult.rowCount} users added`);

    // Remover tag para usuários com conta > 7 dias
    const removeResult = await pool.query(
      `DELETE FROM user_tags ut
       USING users u
       WHERE ut.user_id = u.id
         AND ut.tag_key = $1::varchar
         AND u.created_at <= NOW() - INTERVAL '7 days'`,
      [NEWCOMER_TAG_KEY]
    );

    console.log(`✅ Removed Recém-chegado tag: ${removeResult.rowCount} users removed`);
  } catch (error) {
    console.error('Error updating newcomer tag:', error);
  }
}

// ==================== ATUALIZAR TAG: POPULAR ====================
export async function updatePopularTag() {
  try {
    const REACTION_THRESHOLD = 5000;

    // Conta total de reações recebidas via tabela reactions (schema atual)
    const addResult = await pool.query(
      `WITH popular_users AS (
         SELECT p.author_id AS user_id
         FROM posts p
         JOIN reactions r ON r.post_id = p.id
         GROUP BY p.author_id
         HAVING COUNT(r.id) >= $1
       )
       INSERT INTO user_tags (user_id, tag_key, earned_at)
       SELECT pu.user_id, $2::varchar, NOW()
       FROM popular_users pu
       WHERE NOT EXISTS (
         SELECT 1 FROM user_tags ut
         WHERE ut.user_id = pu.user_id AND ut.tag_key = $3::varchar
       )
       ON CONFLICT (user_id, tag_key) DO NOTHING`,
      [REACTION_THRESHOLD, POPULAR_TAG_KEY, POPULAR_TAG_KEY]
    );

    const removeResult = await pool.query(
      `DELETE FROM user_tags ut
       WHERE ut.tag_key = $1::varchar
         AND ut.user_id NOT IN (
           SELECT p.author_id
           FROM posts p
           JOIN reactions r ON r.post_id = p.id
           GROUP BY p.author_id
           HAVING COUNT(r.id) >= $2
         )`,
      [POPULAR_TAG_KEY, REACTION_THRESHOLD]
    );

    console.log(`✅ Updated Popular tag: ${addResult.rowCount} users added, ${removeResult.rowCount} users removed`);
  } catch (error) {
    console.error('Error updating popular tag:', error);
  }
}

// ==================== ATUALIZAR TAG: ADVERTIDO ====================
export async function updateAdvertidoTag() {
  try {
    // Remover tag 'warned' depois de 60 dias sem infrações adicionais
    const removeResult = await pool.query(
      `DELETE FROM user_tags
       WHERE tag_key = $1
         AND earned_at < NOW() - INTERVAL '60 days'`,
      [WARNED_TAG_KEY]
    );

    console.log(`✅ Removed Advertido tag (expired): ${removeResult.rowCount} users affected`);
  } catch (error) {
    console.error('Error updating advertido tag:', error);
  }
}

// ==================== ATUALIZAR TAG: SILENCIADO ====================
export async function updateSilenciadoTag() {
  try {
    // Remoção de silenciamento é manual por enquanto
    console.log('⏭️  Silenciado tag removal is manual');
  } catch (error) {
    console.error('Error updating silenciado tag:', error);
  }
}

// ==================== EXECUTAR TODAS AS ATUALIZAÇÕES ====================
export async function runTagUpdateCycle() {
  console.log('🔄 Starting automatic tag update cycle...');

  try {
    await ensureTagDefinitions();
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
export function scheduleTagUpdates() {
  // Run once on startup
  runTagUpdateCycle();

  // Schedule for every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(runTagUpdateCycle, SIX_HOURS);

  console.log('📅 Tag update scheduler initialized (every 6 hours)');
}
