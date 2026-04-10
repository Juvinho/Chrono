# ⚡ Solução Rápida - Erro de Conexão

## 🎯 Passos Imediatos

### 1. Verifique se o Backend está rodando

Abra um **novo terminal** e execute:

```powershell
cd server
npm run dev
```

Você deve ver:
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

**⚠️ IMPORTANTE:** Se já houver um processo rodando, pode estar com erro. Pare todos os processos na porta 3001 antes de iniciar novamente.

### 2. Pare processos antigos (se necessário)

No PowerShell, execute:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

Depois inicie novamente:
```powershell
cd server
npm run dev
```

### 3. Teste no Navegador

Abra seu navegador e acesse:
- http://localhost:3001/health

Se você ver `{"status":"ok"}`, está funcionando!

### 4. Verifique o Console do Navegador

No navegador, pressione **F12** para abrir as Ferramentas de Desenvolvedor:
- Vá na aba **Console**
- Procure por erros relacionados a conexão
- Vá na aba **Network** (Rede) e tente fazer login novamente
- Veja se a requisição para `http://localhost:3001/api/auth/login` aparece

### 5. Verifique se o Frontend está na porta correta

O backend espera requisições de `http://localhost:5173` (porta padrão do Vite).

Se o frontend estiver em outra porta, você precisa atualizar o `.env` do servidor ou o código CORS.

## 🔄 Reiniciar Tudo

Se nada funcionar, reinicie tudo nesta ordem:

### Terminal 1 - PostgreSQL:
```powershell
docker-compose down
docker-compose up -d
```

### Terminal 2 - Backend:
```powershell
cd server
npm run db:migrate
npm run dev
```

### Terminal 3 - Frontend:
```powershell
npm run dev
```

## ✅ O que você deve ver:

**Terminal do Backend:**
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

**Terminal do Frontend:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**Navegador:**
- Acesse http://localhost:5173
- Tente fazer login ou registro
- O erro de conexão deve desaparecer

