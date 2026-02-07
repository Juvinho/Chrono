#!/bin/bash
# Script to clean up blank posts from @Sus_bacon
# Usage: DATABASE_URL='postgresql://...' node cleanup_blank.js

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/chrono_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function cleanup() {
  try {
    console.log('🔍 Procurando usuário @Sus_bacon...\n');

    // Find user
    const userRes = await pool.query('SELECT id, username FROM users WHERE username = $1', ['Sus_bacon']);
    if (!userRes.rows[0]) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    const { id: userId, username } = userRes.rows[0];
    console.log(`✅ Usuário encontrado: @${username} (ID: ${userId})\n`);

    // Find blank posts
    const findRes = await pool.query(
      `SELECT id, content, created_at FROM posts 
       WHERE "authorId" = $1 AND (content IS NULL OR TRIM(content) = '')
       ORDER BY created_at DESC`,
      [userId]
    );

    if (findRes.rows.length === 0) {
      console.log('✅ Nenhum post em branco encontrado!');
      process.exit(0);
    }

    console.log(`📝 Encontrados ${findRes.rows.length} post(s) em branco:\n`);
    findRes.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ID: ${row.id}`);
      console.log(`     Data: ${row.created_at}\n`);
    });

    // Delete blank posts
    const delRes = await pool.query(
      `DELETE FROM posts 
       WHERE "authorId" = $1 AND (content IS NULL OR TRIM(content) = '')`,
      [userId]
    );

    console.log(`\n🗑️  ${delRes.rowCount} post(s) deletado(s) com sucesso!\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

cleanup();
