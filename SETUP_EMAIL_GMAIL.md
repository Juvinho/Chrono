# 📧 GUIA: Configuração Gmail para Sistema de Verificação de Email

## 🎯 Objetivo
Configure o Gmail SMTP para enviar emails de verificação de forma segura e profissional.

---

## 📋 MÉTODO 1: SMTP com Senha de App (RECOMENDADO - Mais Simples)

### ⏱️ Tempo: ~5 minutos

Este é o método mais rápido e recomendado para começar. Você precisa:
1. Ativar autenticação de dois fatores
2. Gerar uma "senha de app"
3. Adicionar ao `.env`

---

## PASSO 1️⃣: Ativar Verificação em Duas Etapas

1. **Abra o navegador** e vá em: https://myaccount.google.com

2. **Clique em "Segurança"** (lado esquerdo)

3. **Procure por "Verificação em duas etapas"**
   - Se aparecer "Ativar" → Clique
   - Se já estiver ativo → Pule para o Passo 2

4. **Siga as instruções do Google:**
   - Insira sua senha
   - Escolha um método de verificação (celular, email, etc.)
   - Confirme

✅ **Pronto! Agora você tem 2FA ativado**

---

## PASSO 2️⃣: Gerar Senha de App

1. **Volte em:** https://myaccount.google.com/security

2. **Role para baixo** até encontrar **"Senhas de app"**
   - ⚠️ Só aparece se você tiver 2FA ativado
   - Se não aparecer, volte ao Passo 1

3. **Clique em "Senhas de app"**

4. **Selecione:**
   - Sistema operacional: "Outro (nome personalizado)"
   - Digite: `Chrono Email System`

5. **Clique em "Gerar"**

6. **IMPORTANTE:** Copie a senha que aparecer
   - Exemplo: `xxxx xxxx xxxx xxxx`
   - Só aparece uma vez!
   - Copie agora: **CTRL+C**

```
Sua senha de app será assim:
┌─────────────────────┐
│ aaaa bbbb cccc dddd │
└─────────────────────┘
```

✅ **Pronto! Você tem a senha**

---

## PASSO 3️⃣: Configurar o Arquivo `.env`

1. **Abra o arquivo** `server/.env` (ou crie um novo)

2. **Adicione estas linhas:**

```bash
# Gmail SMTP Configuration
GMAIL_USER=seu_email@gmail.com
GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd

# Frontend
FRONTEND_URL=http://localhost:3000

# Email Configuration
SMTP_FROM_EMAIL=noreply@chrono.com
SMTP_FROM_NAME=Chrono - Rede Social Temporal

# Database (se não tiver)
DATABASE_URL=postgresql://...
```

**⚠️ Substituir:**
- `seu_email@gmail.com` → Seu email real do Google
- `aaaa bbbb cccc dddd` → A senha que você copiou

3. **Salve o arquivo** (CTRL+S)

---

## PASSO 4️⃣: Instalar Dependências

Se ainda não instalou o `nodemailer`:

```bash
cd server
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

## PASSO 5️⃣: Inicializar o Serviço de Email

No arquivo `server/src/index.ts`, adicione:

```typescript
import { initializeEmailService } from './services/emailService.js';

// After other imports...

// Initialize Email Service
const emailService = initializeEmailService({
  gmailUser: process.env.GMAIL_USER!,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD!,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@chrono.com',
  fromName: process.env.SMTP_FROM_NAME || 'Chrono'
});

// Test connection
(async () => {
  const connected = await emailService.testConnection();
  if (!connected) {
    console.error('⚠️ Failed to connect to Gmail SMTP');
  }
})();

// Add email verification routes
import emailVerificationRouter from './routes/emailVerification.js';
app.use('/api/auth/email-verification', emailVerificationRouter);
```

---

## PASSO 6️⃣: Executar Migrations

```bash
# Execute a migration de email verification
psql -U postgres -d chrono < server/src/db/migrations/add_email_verification.sql
```

Ou se usar Docker:

```bash
docker exec chrono-db psql -U postgres -d chrono < server/src/db/migrations/add_email_verification.sql
```

---

## PASSO 7️⃣: Testar o Sistema

### Testar via API (usando curl ou Postman):

```bash
# 1. Registrar um novo usuário
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@gmail.com",
    "username": "testeuser",
    "password": "senha123"
  }'

# 2. Enviarbilizador email de verificação
curl -X POST http://localhost:8080/api/auth/email-verification/send \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"

# 3. Verificar email (copie o link do email recebido)
curl http://localhost:8080/api/auth/email-verification/verify/TOKEN_AQUI
```

### Testar no Frontend:

1. **Abra o app**: http://localhost:3000

2. **Clique em "Registrar"**

3. **Preencha os dados:**
   - Email: `seu_email@gmail.com` (um que você tem acesso)
   - Username: `testuser123`
   - Password: `MinhaS3nh@123`

4. **Clique em "Registrar"**

5. **Procure o email na sua caixa de entrada**
   - Procure também em **Spam/Lixo**
   - De: `Chrono - Rede Social Temporal`

6. **Clique no botão de verificação** ou **copie o link**

7. **Pronto!** Email verificado ✅

---

## 🔧 Troubleshooting

### ❌ "Gmail SMTP connection failed"

**Solução:**
1. Verifique se o 2FA está ativado
2. Verifique se a senha de app está correta
3. Tente novamente em 5 minutos (Google limita tentativas)
4. Certifique-se que `GMAIL_USER` e `GMAIL_APP_PASSWORD` estão no `.env`

### ❌ "Email não chega"

**Solução:**
1. Procure na pasta **Spam/Lixo/Junk**
2. Adicione `noreply@chrono.com` aos contatos
3. Verifique se o email está correto
4. Tente reenviar o email

### ❌ "Token expirado"

**Solução:**
- Tokens têm validade de **24 horas**
- Clique no botão **"Reenviar Email"** para gerar um novo token
- Máximo 3 reenvios por hora

### ❌ "Senha de app não aparece"

**Solução:**
1. Verifique se 2FA está **realmente** ativado
2. Espere 5 minutos e atualize a página
3. Se ainda não aparecer, desative e reative 2FA

---

## 📊 Status do Sistema

Verificar se tudo está funcionando:

```bash
# Ver logs do backend
npm run dev  # No diretório server

# Procurar por:
✅ "Email service connected successfully"
✅ "Verification email sent to user@email.com"
```

---

## 📈 Próximos Passos

Agora você tem um sistema de email verificado!

Você pode adicionar:

1. **Email de Boas-Vindas** (após verificação)
2. **Email de Recuperação de Senha**
3. **Email de Mudança de Email**
4. **Dashboard de Emails** (admin para ver histórico)
5. **Estatísticas** (taxa de verificação)

---

## 🔐 Segurança

✅ **O que agora está protegido:**
- Senhas de app (nunca compartilhar)
- Tokens com expiração de 24h
- Taxa limite de 3 emails/hora
- Logs de auditoria de verificações
- Hash dos tokens no banco de dados

⚠️ **Boas práticas:**
1. Nunca compartilhe sua senha de app
2. Use HTTPS em produção
3. Monitore logs de verificação
4. Configure alertas de segurança no Google

---

## 📧 Se Precisar de Ajuda

- **Gmail**: https://support.google.com
- **NodeMailer**: https://nodemailer.com
- **Chrono**: Abra uma issue no GitHub

---

**Pronto!** 🚀 Seu sistema de verificação de email está funcionando!

Se tiver dúvidas ou problemas, execute:

```bash
npm run dev
# Procure por mensagens com ✅ ou ❌
```
