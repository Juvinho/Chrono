# 🌐 Configurar Acesso pelo IP da Rede

Este guia explica como configurar o sistema para acessar pelo IP da rede (ex: `10.0.1.118:3001`).

## 📋 Passos para Configurar

### 1. Configurar o Backend

O backend já está configurado para aceitar conexões de qualquer IP. Certifique-se de que o arquivo `server/server.env` contém:

```env
HOST=0.0.0.0
PORT=3001
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://10.0.1.118:3000,http://10.0.1.118:5173
```

**Importante:** Substitua `10.0.1.118` pelo seu IP real na rede.

### 2. Configurar o Frontend

Crie um arquivo `.env` na **raiz do projeto** (mesmo nível do `package.json`) com:

```env
VITE_API_URL=http://10.0.1.118:3001/api
```

**Importante:** 
- Substitua `10.0.1.118` pelo IP do servidor onde o backend está rodando
- Se o frontend e backend estão na mesma máquina, use o IP dessa máquina
- Se estão em máquinas diferentes, use o IP da máquina onde o backend está rodando

### 3. Reiniciar os Servidores

Após fazer as alterações:

1. **Pare o backend** (Ctrl+C no terminal onde está rodando)
2. **Pare o frontend** (Ctrl+C no terminal onde está rodando)
3. **Reinicie o backend:**
   ```bash
   cd server
   npm run dev
   ```
4. **Reinicie o frontend:**
   ```bash
   npm run dev
   ```

### 4. Acessar pelo IP

Agora você pode acessar:
- **Frontend:** `http://10.0.1.118:3000` (ou a porta configurada no vite.config.ts)
- **Backend:** `http://10.0.1.118:3001`

## 🔍 Verificar se Está Funcionando

1. **Teste o backend:**
   ```
   http://10.0.1.118:3001/health
   ```
   Deve retornar: `{"status":"ok","timestamp":"..."}`

2. **Teste o frontend:**
   Acesse `http://10.0.1.118:3000` no navegador

3. **Verifique o console do navegador:**
   - Abra as Ferramentas de Desenvolvedor (F12)
   - Vá na aba "Console"
   - Não deve aparecer erros de CORS

## ⚠️ Problemas Comuns

### Erro de CORS
Se aparecer erro de CORS, adicione o IP no `CORS_ORIGIN` do `server/server.env`:
```env
CORS_ORIGIN=http://localhost:5173,http://10.0.1.118:3000,http://10.0.1.118:5173
```

### Não Consegue Conectar
1. Verifique se o firewall permite conexões na porta 3001
2. Verifique se o backend está rodando: `http://10.0.1.118:3001/health`
3. Verifique se o IP está correto no arquivo `.env`

### Mensagem "localhost:3001"
Se ainda aparece mensagem sobre localhost, certifique-se de:
1. Ter criado o arquivo `.env` na raiz do projeto
2. Ter reiniciado o frontend após criar o `.env`
3. O arquivo `.env` ter a linha: `VITE_API_URL=http://10.0.1.118:3001/api`

## 📝 Exemplo Completo de `.env` (raiz do projeto)

```env
VITE_API_URL=http://10.0.1.118:3001/api
GEMINI_API_KEY=sua_chave_aqui
```

## 🔄 Voltar para Localhost

Se quiser voltar a usar apenas localhost:

1. No arquivo `.env` (raiz), mude para:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. Reinicie o frontend

