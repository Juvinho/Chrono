# ✅ Verificar se o Backend Está Funcionando

## Teste Rápido no Navegador

1. Abra seu navegador
2. Acesse: **http://localhost:3001/health**
3. Você deve ver algo como:
   ```json
   {"status":"ok","timestamp":"2025-12-16T..."}
   ```

Se você ver isso, o backend está funcionando! ✅

## Se NÃO funcionar:

### 1. Verificar se o servidor está rodando

No PowerShell, execute:
```powershell
netstat -ano | findstr :3001
```

Se você ver `LISTENING`, o servidor está rodando mas pode estar com erro.

### 2. Reiniciar o Backend

**Pare o servidor atual:**
- No terminal onde o backend está rodando, pressione `Ctrl+C`

**Ou mate o processo:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Depois inicie novamente:**
```powershell
cd server
npm run dev
```

### 3. Verificar Erros no Terminal

Quando você inicia o backend, deve ver:
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

Se houver erros (como erro de conexão com banco), eles aparecerão aqui.

### 4. Verificar o PostgreSQL

```powershell
docker ps
```

Deve mostrar `chrono_postgres` rodando. Se não estiver:
```powershell
docker-compose up -d
```

### 5. Executar Migrations (se necessário)

```powershell
cd server
npm run db:migrate
```

## 🔍 Depuração no Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Network** (Rede)
3. Tente fazer login ou registro
4. Procure por uma requisição para `http://localhost:3001/api/auth/login`
5. Clique nela para ver:
   - Status (deve ser 200, 400, 401, etc.)
   - Response (resposta do servidor)
   - Headers (cabeçalhos)

Se a requisição aparecer como vermelha ou não aparecer, o problema é de conexão.

## 🚀 Iniciar Tudo Corretamente

```powershell
# Terminal 1 - PostgreSQL
docker-compose up -d

# Terminal 2 - Backend
cd server
npm run db:migrate
npm run dev

# Terminal 3 - Frontend
npm run dev
```

Ou use o script que inicia ambos:
```powershell
npm run dev:all
```

