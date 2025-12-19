# 🔍 Troubleshooting - Email Não Enviado

Se você não recebeu o email de verificação, siga este guia passo a passo.

## ✅ Checklist Rápido

1. **Verifique os logs do servidor backend** - Procure por mensagens de erro
2. **Verifique o arquivo `.env`** - Todas as configurações estão corretas?
3. **Verifique a pasta de spam** - O email pode ter ido para lá
4. **Teste a conexão SMTP** - Use o script de teste abaixo

---

## 🔍 Passo 1: Verificar Logs do Servidor

Quando você registra, olhe o terminal onde o servidor backend está rodando. Você deve ver mensagens como:

**✅ Sucesso:**
```
📧 Attempting to send verification email to: seu-email@gmail.com
✅ Verification email sent successfully!
   Message ID: <mensagem-id>
```

**❌ Erro:**
```
❌ Error sending verification email:
   Error code: EAUTH
   Error message: Invalid login
```

**Anote o erro** e veja a solução abaixo.

---

## 🔍 Passo 2: Verificar Arquivo .env

Certifique-se que o arquivo `server/.env` tem todas essas variáveis:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-app-password-aqui
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANTE:**
- `SMTP_USER` deve ser seu email completo
- `SMTP_PASS` deve ser a **App Password** (não sua senha normal!)
- Não tenha espaços antes ou depois dos valores
- Depois de mudar o `.env`, **reinicie o servidor**!

---

## 🔍 Passo 3: Erros Comuns e Soluções

### Erro: "Invalid login" ou "EAUTH"

**Causa:** Credenciais incorretas ou App Password inválida.

**Solução:**
1. Gere uma nova App Password: https://myaccount.google.com/apppasswords
2. Certifique-se de remover os espaços da senha
3. Atualize o `.env` com a nova senha
4. Reinicie o servidor

### Erro: "SMTP credentials not configured"

**Causa:** Variáveis não estão no `.env` ou servidor não carregou.

**Solução:**
1. Verifique se o arquivo `server/.env` existe
2. Verifique se todas as variáveis estão lá
3. Reinicie o servidor backend

### Erro: "Connection timeout" ou "ETIMEDOUT"

**Causa:** Problema de conexão ou firewall bloqueando.

**Solução:**
1. Verifique sua conexão com internet
2. Tente usar uma rede diferente
3. Verifique se o firewall não está bloqueando a porta 587

### Nenhum erro, mas email não chega

**Possíveis causas:**
1. ✅ Email foi para spam - **Verifique a pasta de spam/lixo eletrônico**
2. ✅ Demora de entrega - Pode levar até 5 minutos
3. ✅ Email errado no cadastro - Verifique se digitou corretamente
4. ✅ Filtros de email - Verifique filtros no Gmail

---

## 🧪 Passo 4: Testar Configuração SMTP

Crie um arquivo `server/test-email.js` para testar:

```javascript
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'MISSING!');

    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    const info = await transporter.sendMail({
      from: `"Chrono Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Envia para você mesmo
      subject: 'Teste Chrono',
      text: 'Este é um email de teste do Chrono. Se você recebeu isso, a configuração está funcionando!',
    });

    console.log('✅ Test email sent!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
```

Execute:
```bash
cd server
node test-email.js
```

---

## 📋 Checklist Completo

Antes de reportar problemas, verifique:

- [ ] Arquivo `server/.env` existe e tem todas as variáveis
- [ ] `SMTP_USER` é seu email completo
- [ ] `SMTP_PASS` é uma App Password (não senha normal)
- [ ] App Password foi gerada corretamente (sem espaços)
- [ ] Verificação em duas etapas está ativa no Google
- [ ] Servidor backend foi reiniciado depois de mudar `.env`
- [ ] Logs do servidor mostram tentativa de envio
- [ ] Verificou pasta de spam/lixo eletrônico
- [ ] Email foi digitado corretamente no registro
- [ ] Aguardou alguns minutos (pode ter demora)

---

## 💡 Dica Final

Se nada funcionar, tente:

1. **Usar outro email** (Outlook, Yahoo) - veja configurações em `GUIA_EMAIL.md`
2. **Usar serviço de email profissional** (SendGrid, Mailgun) - mais confiável para produção
3. **Verificar logs detalhados** - O servidor agora mostra mais informações sobre erros

