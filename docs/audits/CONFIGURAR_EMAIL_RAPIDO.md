# ⚡ Configuração Rápida de Email - Chrono

## 🚀 Passo a Passo Rápido (5 minutos)

### 1️⃣ Ativar Verificação em Duas Etapas no Google

1. Vá para: https://myaccount.google.com/security
2. Ative **"Verificação em duas etapas"**

### 2️⃣ Gerar App Password

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione:
   - App: **"Mail"** (ou "Outro" e digite "Chrono")
   - Device: **"Windows Computer"** (ou "Outro")
3. Clique em **"Gerar"**
4. **Copie a senha gerada** (exemplo: `abcd efgh ijkl mnop`)
5. **Remova os espaços**: `abcdefghijklmnop`

### 3️⃣ Configurar arquivo .env

Abra `server/.env` e adicione/atualize:

```env
FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**⚠️ IMPORTANTE:**
- Substitua `seu-email@gmail.com` pelo seu email
- Substitua `abcdefghijklmnop` pela App Password (sem espaços!)

### 4️⃣ Instalar Dependências (se necessário)

```bash
cd server
npm install
```

### 5️⃣ Reiniciar o Servidor

```bash
cd server
npm run dev
```

### 6️⃣ Testar

1. Acesse: http://localhost:5173
2. Clique em **"Registrar"**
3. Preencha o formulário com um email real
4. Verifique sua caixa de entrada (e spam!)
5. Clique no link no email
6. Você verá um popup confirmando a ativação! ✅

---

## ✅ Pronto!

Agora o sistema de email está funcionando! 🎉

**Dica:** O email pode demorar alguns segundos para chegar. Se não aparecer, verifique a pasta de spam.

