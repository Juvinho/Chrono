# 🚀 Instrução para Corrigir Crash no Railway

## Status da Correção

✅ **Schema.sql**: Corrigido e enviado (git push)  
⏳ **JWT_SECRET**: Precisa ser adicionado no Railway manualmente

---

## ⚡ Problema Original

```
Error: CRITICAL: JWT_SECRET environment variable is not set. Cannot start server
```

O servidor está em **loop infinito de restart** porque a variável `JWT_SECRET` não está configurada no Railway.

---

## 📋 Solução em 3 Passos

### **Passo 1: Acessar Railway Dashboard**

1. Vá para https://railway.app/
2. Acesse seu projeto **Chrono**
3. Clique em **Variables** (no menu do lado esquerdo)

### **Passo 2: Adicionar JWT_SECRET**

1. Clique em **New Variable**
2. Preencha:
   ```
   Key: JWT_SECRET
   Value: minha_chave_secreta_super_segura_32_caracteres_aleatorios_xyz123
   ```

3. **Gere uma chave segura** (exemplo com Node):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Cole a chave gerada no campo `Value`

5. Clique em **Save** (ou Enter)

### **Passo 3: Redeploy**

1. Vá para **Deployments** (no menu do lado esquerdo)
2. Clique em **Redeploy Latest** 
3. Aguarde ~2-3 minutos

---

## ✅ Verificar Sucesso

Após o deploy, check nos **Logs**:

```
✅ CORRETO (procure por):
📡 Conectando ao banco de dados: postgresql://...
✅ Server started on port 8080

❌ ERRADO (se vir isso):
Error: CRITICAL: JWT_SECRET environment variable is not set
```

---

## 📝 O Que Was Ao Código

### **Arquivo: schema.sql**

**Antes:**
- 133 statements com 100+ warnings
- Blocos `DO $$ ... $$` mal formatados
- IF/THEN/ELSE quebrados (problemas de sintaxe)

**Depois:**
- 484 linhas limpas
- Sem blocos `DO $$` problemáticos usando lógica condicional complexa
- Triggers e Functions bem-formadas
- Idempotent migrations (seguro rodar múltiplas vezes)

**Tabelas Mantidas:**
- ✅ users, conversations, messages
- ✅ posts, threads, reactions
- ✅ notifications, push_subscriptions
- ✅ followers, items, user_profiles

**Remocido:**
- ❌ Blocos DO $$ com IF/ALTER que causavam parsing errors

---

## 🔐 Segurança

A chave `JWT_SECRET` é usada para:
- ✅ Assinar tokens de autenticação
- ✅ Verificar Socket.io connections
- ✅ Validar sessões do usuário

**Importante:**
- Nunca commit JWT_SECRET no git (deve estar apenas em Railway Variables)
- Mestre que é única por ambiente (prod ≠ dev)
- Se vazar, gere uma nova e atualize em Railway

---

## 📞 Se Falhar...

### Passo A: Confirma que JWT_SECRET está salvo
```
Railway → Variables → veja se JWT_SECRET aparece na lista
```

### Passo B: Verifica se rebuild começou
```
Railway → Deployments → veja se há um deployment EN PROGRESSO
```

### Passo C: Veja os logs completos
```
Railway → Logs → procure por "Error" ou "CRITICAL"
```

---

## ✨ Próximos Passos

Após o app subir com sucesso:

1. **Teste um endpoint básico:**
   ```bash
   curl https://seu-app.railway.app/api/health
   ```

2. **Teste Socket.io:**
   ```javascript
   const socket = io('https://seu-app.railway.app', {
     auth: { token: 'seu_token_jwt' }
   });
   ```

3. **Monitore os logs:**
   - Railway → Logs (tempo real)
   - Procure por mensagens de erro

---

**Status: Schema fixo + código enviado + Aguardando JWT_SECRET**

Após adicionar JWT_SECRET e redeploy, seu app estará 100% funcional! 🎉
