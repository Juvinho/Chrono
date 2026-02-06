import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Prefer environment variables, fallback to known endpoints (masked in logs)
const SOURCE_URL = process.env.SOURCE_DB_URL || "postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway";
const TARGET_URL = process.env.TARGET_DB_URL || "postgresql://postgres:27Set%402004%23%2AJuvinho123%5D@db.aamgqywcifppjgwgspsg.supabase.co:6543/postgres";

async function migrate() {
    console.log('🚀 Iniciando processo de migração completa...');
    
    const sourcePool = new Pool({ 
        connectionString: SOURCE_URL.split('?')[0],
        ssl: { rejectUnauthorized: false }
    });
    const targetPool = new Pool({ 
        connectionString: TARGET_URL.split('?')[0],
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. TEST CONNECTIONS
        const mask = (url: string) => url.replace(/:([^:@]+)@/, ':****@');
        console.log('🔗 Testando conexões...');
        console.log(`   • Origem: ${mask(SOURCE_URL)}`);
        console.log(`   • Destino: ${mask(TARGET_URL)}`);
        try {
            await sourcePool.query('SELECT 1');
            console.log('✅ Conexão com Railway OK.');
        } catch (e: any) {
            throw new Error(`Falha ao conectar no Railway: ${e.message}`);
        }

        try {
            await targetPool.query('SELECT 1');
            console.log('✅ Conexão com Supabase OK.');
        } catch (e: any) {
            throw new Error(`Falha ao conectar no Supabase: ${e.message}. Verifique se a senha está correta e se você tem internet.`);
        }

        // 2. APPLY SCHEMA FIRST
        console.log('📜 Aplicando schema no Supabase...');
        const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await targetPool.query(schemaSql);
            console.log('✅ Schema aplicado com sucesso.');
        } else {
            console.warn('⚠️ Arquivo schema.sql não encontrado. Pulando criação de tabelas.');
        }

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

        // 3. MIGRATE DATA
        const counts: Record<string, { source: number; targetBefore: number; targetAfter: number }> = {};
        for (const table of tables) {
            console.log(`📦 Migrando tabela: ${table}...`);
            
            const { rows } = await sourcePool.query(`SELECT * FROM ${table}`);
            
            if (rows.length === 0) {
                console.log(`ℹ️ Tabela ${table} está vazia. Pulando.`);
                const tb = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);
                counts[table] = { source: 0, targetBefore: parseInt(tb.rows[0].c || '0'), targetAfter: parseInt(tb.rows[0].c || '0') };
                continue;
            }

            console.log(`  - Encontrados ${rows.length} registros.`);
            const before = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);

            for (const row of rows) {
                const keys = Object.keys(row);
                const values = Object.values(row);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const columns = keys.join(', ');
                
                const upsertAction = keys
                    .filter(k => k !== 'id')
                    .map(k => `${k} = EXCLUDED.${k}`)
                    .join(', ');

                const query = `
                    INSERT INTO ${table} (${columns}) 
                    VALUES (${placeholders}) 
                    ON CONFLICT (id) DO UPDATE SET ${upsertAction}
                `;

                try {
                    await targetPool.query(query, values);
                } catch (err: any) {
                    console.error(`❌ Erro ao inserir na tabela ${table}:`, err.message);
                }
            }
            console.log(`✅ Tabela ${table} migrada.`);
            const after = await targetPool.query(`SELECT COUNT(*) AS c FROM ${table}`);
            counts[table] = { source: rows.length, targetBefore: parseInt(before.rows[0].c || '0'), targetAfter: parseInt(after.rows[0].c || '0') };
        }

        console.log('\n🧾 Relatório de integridade:');
        for (const [table, c] of Object.entries(counts)) {
            console.log(`   • ${table}: origem=${c.source} | destino antes=${c.targetBefore} → depois=${c.targetAfter}`);
        }
        console.log('\n✨ MIGRACÃO CONCLUÍDA COM SUCESSO! ✨');
    } catch (error: any) {
        console.error('\n❌ ERRO CRÍTICO:', error.message);
        console.log('\n💡 DICA: Se o erro for ENOTFOUND, tente trocar de rede ou verificar se o host do Supabase está correto.');
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

migrate();
