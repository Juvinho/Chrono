# 🔍 Diagnóstico de Conexão com o Servidor

Se você está vendo a mensagem: **"Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando em http://localhost:3001/api"**

## ✅ Checklist Rápido

### 1. Verificar se o Backend está rodando

Abra um terminal e execute:

```powershell
netstat -ano | findstr :3001
```

Se você ver algo como `LISTENING`, o servidor está rodando.

### 2. Testar o Backend no Navegador

Abra seu navegador e acesse:
- **http://localhost:3001/health**

Se você ver `{"status":"ok","timestamp":"..."}`, o backend está funcionando!

### 3. Verificar se o PostgreSQL está rodando

```powershell
docker ps
```

Deve mostrar o container `chrono_postgres` rodando.

### 4. Verificar logs do Backend

No terminal onde o backend está rodando, você deve ver:
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

Se houver erros, eles aparecerão aqui.

## 🔧 Soluções Comuns

### Backend não está rodando

**Solução:**
```powershell
cd server
npm run dev
```

### PostgreSQL não está rodando

**Solução:**
```powershell
docker-compose up -d
```

### Erro de conexão com o banco

**Solução:**
1. Verifique se o Docker está rodando
2. Execute: `cd server && npm run db:migrate`

### Frontend não consegue conectar

**Solução:**
1. Verifique se o backend está acessível em http://localhost:3001/health
2. Verifique se não há firewall bloqueando
3. Tente acessar diretamente no navegador: http://localhost:3001/api/auth/login

## 📝 Verificar Logs do Backend

No terminal onde o backend está rodando, você deve ver as requisições chegando. Se não aparecer nada quando você faz login, o problema pode ser:

1. **Frontend não está enviando requisições**
   - Verifique o console do navegador (F12)
   - Veja se há erros de CORS

2. **Backend está recebendo mas não processando**
   - Verifique os logs do terminal do backend
   - Veja se há erros de banco de dados

3. **Problema de CORS**
   - O backend deve aceitar requisições de `http://localhost:5173`
   - Verifique se o frontend está rodando nessa porta

## 🚀 Iniciar Tudo do Zero

Se nada funcionar, tente iniciar tudo novamente:

1. **Inicie o PostgreSQL:**
   ```powershell
   docker-compose up -d
   ```

2. **Execute as migrations:**
   ```powershell
   cd server
   npm run db:migrate
   ```

3. **Inicie o Backend:**
   ```powershell
   cd server
   npm run dev
   ```

4. **Em outro terminal, inicie o Frontend:**
   ```powershell
   npm run dev
   ```

5. **Ou use o script que inicia ambos:**
   ```powershell
   npm run dev:all
   ```

