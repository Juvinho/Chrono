// Script para enviar emails de verificação para todos os usuários não verificados


import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { fileURLToPath } from 'url';

import nodemailer from 'nodemailer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const connectionPath = path.resolve(__dirname, '../dist/db/connection.js');
const { pool } = require(connectionPath);

async function main() {
  // Buscar todos os usuários não verificados
  const usersResult = await pool.query(
    `SELECT id, username, email, email_verified FROM users WHERE email_verified = false OR email_verified IS NULL`
  );

  if (usersResult.rows.length === 0) {
    console.log('Nenhum usuário não verificado encontrado.');
    process.exit(0);
  }

  console.log(`Encontrados ${usersResult.rows.length} usuários não verificados.`);

  // Configuração do transporter do nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  for (const user of usersResult.rows) {
    try {
      // Buscar o token já salvo no banco
      const tokenResult = await pool.query(
        `SELECT verification_token FROM users WHERE id = $1`,
        [user.id]
      );
      if (!tokenResult.rows.length || !tokenResult.rows[0].verification_token) {
        console.error(`Usuário ${user.email} não possui token de verificação.`);
        continue;
      }
      // O token salvo está hasheado, então precisamos gerar um novo token e atualizar o banco para enviar o link correto
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await pool.query(
        `UPDATE users SET verification_token = $1, verification_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, user.id]
      );

      const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
      const mailOptions = {
        from: `Chrono <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: '✉️ Verifique seu email - Chrono',
        html: `<p>Olá, ${user.username}!<br>Por favor, <a href="${verificationLink}">clique aqui para verificar seu email</a>.<br>Se não foi você, ignore este email.</p>`
      };
      await transporter.sendMail(mailOptions);
      console.log(`Email de verificação enviado para: ${user.email}`);
    } catch (err) {
      console.error(`Erro ao enviar email para ${user.email}:`, err);
    }
  }

  process.exit(0);
}

main();
