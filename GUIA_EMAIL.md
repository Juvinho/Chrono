# 📧 Guia Passo a Passo - Configuração de Email

Este guia mostra como configurar o envio de emails de verificação de conta no Chrono.

## 📋 Pré-requisitos

- Conta Gmail (ou outro serviço SMTP)
- Acesso às configurações de segurança da sua conta Google

---

## 🔧 Passo a Passo Completo

### Passo 1: Habilitar Verificação em Duas Etapas no Google

1. Acesse: https://myaccount.google.com/security
2. Procure por **"Verificação em duas etapas"** ou **"2-Step Verification"**
3. Clique e ative a verificação em duas etapas
4. Siga as instruções para configurar (pode usar SMS, aplicativo autenticador, etc.)

**⚠️ IMPORTANTE:** Você precisa ter a verificação em duas etapas ativada para gerar uma App Password!

---

### Passo 2: Gerar App Password (Senha de Aplicativo)

1. Com a verificação em duas etapas ativada, acesse:
   https://myaccount.google.com/apppasswords

2. Se não aparecer o link direto, vá para:
   - https://myaccount.google.com/security
   - Procure por **"Senhas de app"** ou **"App passwords"**
   - Clique em **"Senhas de app"**

3. Selecione:
   - **App:** Escolha "Mail" ou "Other (Custom name)" e digite "Chrono"
   - **Device:** Escolha "Windows Computer" ou "Other (Custom name)" e digite "Development"

4. Clique em **"Gerar"** ou **"Generate"**

5. **Copie a senha gerada** (ela aparece apenas uma vez!):
   - Exemplo: `abcd efgh ijkl mnop`
   - **Remova os espaços** ao usar: `abcdefghijklmnop`

---

### Passo 3: Configurar o arquivo .env

1. Abra o arquivo `server/.env` no editor

2. Adicione ou atualize as seguintes linhas:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=abcdefghijklmnop
FRONTEND_URL=http://localhost:5173
```

**Substitua:**
- `seu-email@gmail.com` pelo seu email real
- `abcdefghijklmnop` pela App Password que você gerou (sem espaços)

**Exemplo completo:**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chrono_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=meuemail@gmail.com
SMTP_PASS=abcd1234efgh5678ijkl
```

---

### Passo 4: Instalar Dependências (se ainda não instalou)

Na pasta `server/`, execute:

```bash
npm install
```

Isso instalará o `nodemailer` e suas dependências.

---

### Passo 5: Reiniciar o Servidor Backend

1. Pare o servidor backend se estiver rodando (Ctrl+C)
2. Inicie novamente:

```bash
cd server
npm run dev
```

---

### Passo 6: Testar o Sistema

1. **Certifique-se de que o banco está vazio** (já limpamos anteriormente)

2. **Acesse o frontend** em: http://localhost:5173

3. **Clique em "Registrar"**

4. **Preencha o formulário** com:
   - Username
   - Email (use um email real que você tem acesso)
   - Password

5. **Clique em registrar**

6. **Verifique sua caixa de entrada** (e spam/lixo eletrônico) do email informado

7. **Clique no link de verificação** no email

8. **Você será redirecionado** para a página inicial com um popup confirmando que sua conta foi ativada!

---

## 🔍 Solução de Problemas

### Erro: "Invalid login" ou "Authentication failed"

**Problema:** A senha ou configuração do SMTP está incorreta.

**Solução:**
1. Verifique se você removeu os espaços da App Password
2. Certifique-se de que a verificação em duas etapas está ativada
3. Gere uma nova App Password e atualize o `.env`

### Erro: "Email não enviado" mas registro funciona

**Problema:** O email falhou, mas o sistema continua em modo desenvolvimento.

**Solução:**
- Verifique os logs do servidor para ver o erro específico
- Confirme que todas as variáveis do `.env` estão corretas
- Teste com outro email

### Email vai para spam

**Solução:**
- Marque o email como "Não é spam"
- Adicione o remetente aos contatos
- Em produção, configure SPF/DKIM no servidor de email

### Não recebe o email

**Verifique:**
1. ✅ Caixa de spam/lixo eletrônico
2. ✅ Se o email está correto no formulário
3. ✅ Logs do servidor para erros
4. ✅ Se o SMTP_USER está correto no `.env`

---

## 📧 Usando Outros Provedores SMTP

### Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha
```

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@yahoo.com
SMTP_PASS=sua-app-password
```

### SendGrid (Recomendado para produção)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=sua-api-key-do-sendgrid
```

---

## ✅ Checklist Final

Antes de testar, certifique-se:

- [ ] Verificação em duas etapas ativada no Google
- [ ] App Password gerada e copiada
- [ ] Arquivo `server/.env` configurado corretamente
- [ ] Dependências instaladas (`npm install` na pasta server)
- [ ] Servidor backend reiniciado
- [ ] Frontend rodando em http://localhost:5173
- [ ] Banco de dados limpo (já feito)

---

## 🎉 Pronto!

Agora quando um usuário se registrar:
1. ✅ Receberá um email de verificação
2. ✅ Clicará no link no email
3. ✅ Será redirecionado para a página inicial
4. ✅ Verá um popup confirmando a ativação
5. ✅ Poderá fazer login normalmente

