# 🔍 Verificar se o Servidor está Rodando

Se você está recebendo o erro "Failed to fetch", significa que o frontend não consegue se conectar ao backend.

## ✅ Passos para Verificar

### 1. Verificar se o Backend está Rodando

Abra um terminal e execute:

```bash
cd server
npm run dev
```

Você deve ver uma mensagem como:
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

### 2. Testar o Backend Diretamente

Abra seu navegador e acesse:
- http://localhost:3001
- http://localhost:3001/health

Se você ver uma resposta JSON, o backend está funcionando!

### 3. Verificar a URL da API

O frontend está configurado para usar:
- **Padrão**: `http://localhost:3001/api`
- **Ou a variável de ambiente**: `VITE_API_URL`

Se o backend estiver em outra porta, crie um arquivo `.env` na raiz do projeto com:

```env
VITE_API_URL=http://localhost:PORTA/api
```

### 4. Verificar CORS

O backend deve estar configurado para aceitar requisições do frontend. No arquivo `server/src/index.ts`, verifique:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

### 5. Iniciar Ambos os Servidores

**Opção 1: Script automático (recomendado)**
```bash
npm run dev:all
```

**Opção 2: Terminal separado**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

## ⚠️ Problemas Comuns

### Backend não inicia
- Verifique se o PostgreSQL está rodando: `docker-compose up -d`
- Verifique se as migrations foram executadas: `cd server && npm run db:migrate`
- Verifique se há erros no terminal

### Porta já em uso
- Altere a porta no arquivo `server/.env`:
  ```
  PORT=3002
  ```
- E atualize o `.env` do frontend:
  ```
  VITE_API_URL=http://localhost:3002/api
  ```

### Erro de conexão
- Certifique-se de que não há firewall bloqueando
- Verifique se ambos os servidores estão rodando
- Tente reiniciar ambos os servidores

## 🎯 Depois de Verificar

1. Backend rodando em http://localhost:3001 ✅
2. Frontend rodando em http://localhost:5173 ✅
3. Backend acessível (teste no navegador) ✅
4. Tente fazer login/registro novamente


