import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Railway URL (Source)
const SOURCE_URL = "postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway";
// Supabase URL (Target) - Using Pooler Port 6543 for better reliability
const TARGET_URL = "postgresql://postgres:27Set%402004%23%2AJuvinho123%5D@db.aamgqywcifppjgwgspsg.supabase.co:6543/postgres";

async function migrate() {
    console.log('🚀 Iniciando processo de migração completa...');
    
    const sourcePool = new Pool({ connectionString: SOURCE_URL });
    const targetPool = new Pool({ 
        connectionString: TARGET_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. TEST CONNECTIONS
        console.log('🔗 Testando conexões...');
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
            'stories',
            'encrypted_cords'
        ];

        // 3. MIGRATE DATA
        for (const table of tables) {
            console.log(`📦 Migrando tabela: ${table}...`);
            
            const { rows } = await sourcePool.query(`SELECT * FROM ${table}`);
            
            if (rows.length === 0) {
                console.log(`ℹ️ Tabela ${table} está vazia. Pulando.`);
                continue;
            }

            console.log(`  - Encontrados ${rows.length} registros.`);

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
