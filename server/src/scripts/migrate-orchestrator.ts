import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const SOURCE_URL = process.env.SOURCE_DB_URL || '';
const TARGET_URL = process.env.TARGET_DB_URL || process.env.DATABASE_URL || '';
const DRY_RUN = (process.env.DRY_RUN === '1' || process.env.ORCHESTRATOR_DRY_RUN === '1');

const mask = (url: string) => url.replace(/:([^:@]+)@/, ':****@');
const tables = [
  'users',
  'items',
  'images',
  'videos',
  'user_profiles',
  'user_settings',
  'user_items',
  'follows',
  'conversations',
  'conversation_participants',
  'posts',
  'reactions',
  'poll_votes',
  'messages',
  'message_status',
  'notifications',
  'encrypted_cords'
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(process.cwd(), 'migration-logs');
  ensureDir(logsDir);
  const logFile = path.join(logsDir, `migration-${ts}.log`);
  const reportFile = path.join(logsDir, `report-${ts}.json`);

  const log = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
  };

  log('🚀 Iniciando orquestração de migração');
  log(`   • Origem: ${SOURCE_URL ? mask(SOURCE_URL) : '(não definida)'}`);
  log(`   • Destino: ${TARGET_URL ? mask(TARGET_URL) : '(não definida)'}`);

  const resultSummary: any = { schemaApplied: false, dataMigrated: false, counts: {}, steps: [] };
  if (!TARGET_URL) {
    if (DRY_RUN) {
      log('⚠️ TARGET_DB_URL/DATABASE_URL não definida. Executando em modo dry-run.');
      fs.writeFileSync(reportFile, JSON.stringify({ dryRun: true, ...resultSummary }, null, 2));
      log(`🧾 Relatório (dry-run) salvo em: ${reportFile}`);
      log('✨ Orquestração (dry-run) concluída.');
      return;
    } else {
      log('❌ TARGET_DB_URL/DATABASE_URL não definida');
      process.exit(1);
    }
  }

  const sourcePool = SOURCE_URL ? new Pool({ connectionString: SOURCE_URL.split('?')[0], ssl: { rejectUnauthorized: false } }) : null;
  const targetPool = new Pool({ connectionString: TARGET_URL.split('?')[0], ssl: TARGET_URL.includes('localhost') || TARGET_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false } });

  // resultSummary already declared above

  try {
    // Test target connection
    log('🔗 Testando conexão com destino...');
    await targetPool.query('SELECT 1');
    log('✅ Conexão destino OK.');

    // Apply schema
    log('📜 Aplicando schema no destino...');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await targetPool.query(schemaSql);
      log('✅ Schema aplicado.');
      resultSummary.schemaApplied = true;
    } else {
      log('⚠️ schema.sql não encontrado.');
    }

    // Data migration
    if (sourcePool) {
      log('📦 Migrando dados tabela por tabela...');
      for (const table of tables) {
        try {
          const srcRows = await sourcePool.query(`SELECT * FROM ${table}`);
          const before = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);
          await targetPool.query('BEGIN');
          try {
            for (const row of srcRows.rows) {
              const keys = Object.keys(row);
              const values = Object.values(row);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const columns = keys.join(', ');
              const upsertAction = keys.filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
              const q = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${upsertAction}`;
              await targetPool.query(q, values);
            }
            await targetPool.query('COMMIT');
          } catch (e: any) {
            await targetPool.query('ROLLBACK');
            log(`❌ Falha ao migrar tabela ${table}: ${e.message}`);
          }
          const after = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);
          log(`✅ ${table}: origem=${srcRows.rows.length} | destino antes=${parseInt(before.rows[0].c || '0')} → depois=${parseInt(after.rows[0].c || '0')}`);
          resultSummary.counts[table] = {
            source: srcRows.rows.length,
            targetBefore: parseInt(before.rows[0].c || '0'),
            targetAfter: parseInt(after.rows[0].c || '0'),
          };
        } catch (err: any) {
          log(`ℹ️ ${table}: erro ou tabela vazia (${err.message})`);
          const after = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);
          resultSummary.counts[table] = { source: 0, targetBefore: 0, targetAfter: parseInt(after.rows[0].c || '0') };
        }
      }
      resultSummary.dataMigrated = true;
    } else {
      log('⚠️ SOURCE_DB_URL não definida. Pulando migração de dados.');
    }

    // Fix encrypted schema pieces
    log('🔐 Ajustando schema de criptografia...');
    try {
      await targetPool.query(`
        ALTER TABLE encrypted_cords 
        ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS self_destruct_timer INTEGER DEFAULT 60;
      `);
      await targetPool.query(`
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS delete_at TIMESTAMP;
      `);
      await targetPool.query(`CREATE INDEX IF NOT EXISTS idx_messages_delete_at ON messages(delete_at);`);
      log('✅ Ajuste de criptografia aplicado.');
    } catch (e: any) {
      log(`❌ Falha ao ajustar criptografia: ${e.message}`);
    }

    // Write report
    fs.writeFileSync(reportFile, JSON.stringify(resultSummary, null, 2));
    log(`🧾 Relatório salvo em: ${reportFile}`);
    log('✨ Orquestração concluída.');
  } catch (error: any) {
    log(`❌ Erro crítico: ${error.message}`);
    fs.writeFileSync(reportFile, JSON.stringify({ error: error.message, ...resultSummary }, null, 2));
    process.exitCode = 1;
  } finally {
    await targetPool.end();
    if (sourcePool) await sourcePool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
