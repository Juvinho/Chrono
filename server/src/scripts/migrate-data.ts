import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway URL (Source)
const SOURCE_URL = "postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway";
// Supabase URL (Target) - Use the one with encoded password
const TARGET_URL = "postgresql://postgres:27Set%402004%23%2AJuvinho123%5D@db.aamgqywcifppjgwgspsg.supabase.co:5432/postgres";

async function migrate() {
    console.log('🚀 Iniciando migração de dados...');
    
    const sourcePool = new Pool({ connectionString: SOURCE_URL });
    const targetPool = new Pool({ connectionString: TARGET_URL });

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

    try {
        for (const table of tables) {
            console.log(`📦 Migrando tabela: ${table}...`);
            
            // Get data from source
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
                
                // Construct UPSERT query (to avoid duplicates if run multiple times)
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
            console.log(`✅ Tabela ${table} migrada com sucesso.`);
        }

        console.log('\n✨ MIGRACÃO CONCLUÍDA COM SUCESSO! ✨');
    } catch (error: any) {
        console.error('\n❌ ERRO CRÍTICO NA MIGRAÇÃO:', error.message);
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

migrate();
