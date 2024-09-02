import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function clearTables() {
  try {
    console.log('Limpando todas as tabelas do banco de dados...');
    
    const clearScript = readFileSync(join(__dirname, 'clear-tables.sql'), 'utf-8');
    await pool.query(clearScript);
    
    console.log('✅ Todas as tabelas foram limpas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar tabelas:', error);
    process.exit(1);
  }
}

clearTables();

