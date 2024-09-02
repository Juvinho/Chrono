# 🚀 Como Iniciar o Backend

## Passos Rápidos

### 1. Verificar se o PostgreSQL está rodando

```bash
docker-compose up -d
```

### 2. Executar Migrations (se necessário)

```bash
cd server
npm run db:migrate
```

### 3. Iniciar o Servidor Backend

```bash
cd server
npm run dev
```

Você deve ver:
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

### 4. Testar o Backend

Abra seu navegador e acesse:
- http://localhost:3001/health

Deve retornar:
```json
{"status":"ok","timestamp":"..."}
```

## ⚠️ Problemas Comuns

### Erro: "Cannot find module"
- Execute: `cd server && npm install`

### Erro: "Connection refused" no PostgreSQL
- Execute: `docker-compose up -d`
- Verifique se o Docker está rodando

### Porta 3001 já em uso
- Altere a porta no arquivo `server/.env`:
  ```
  PORT=3002
  ```
- E atualize o frontend para usar a nova porta

## ✅ Depois de Iniciar

Quando o backend estiver rodando, você pode iniciar o frontend:

```bash
npm run dev
```

Ou iniciar ambos juntos:

```bash
npm run dev:all
```


