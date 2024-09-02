# 🚀 Guia Rápido - Como Rodar o Chrono

## Passo a Passo Completo

### 1️⃣ Instalar Dependências do Backend

```bash
cd server
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente do Backend

Renomeie o arquivo `server.env` para `.env` na pasta `server/`:

**Windows PowerShell:**
```powershell
cd server
Copy-Item server.env .env
```

**Windows CMD:**
```cmd
cd server
copy server.env .env
```

**Linux/Mac:**
```bash
cd server
cp server.env .env
```

Ou crie manualmente o arquivo `server/.env` com:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chrono_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 3️⃣ Iniciar o Banco de Dados (PostgreSQL)

**Opção A: Usando Docker (Mais Fácil)**

Na raiz do projeto:
```bash
docker-compose up -d
```

**Opção B: PostgreSQL Local**

Se você já tem PostgreSQL instalado, crie o banco:
```sql
CREATE DATABASE chrono_db;
```

E ajuste o `DATABASE_URL` no `.env` se necessário.

### 4️⃣ Criar as Tabelas no Banco (Migrations)

```bash
cd server
npm run db:migrate
```

Você deve ver: `✅ Database migrations completed successfully!`

### 5️⃣ Iniciar o Servidor Backend

Em um terminal, na pasta `server/`:
```bash
npm run dev
```

Você deve ver: `🚀 Server running on http://localhost:3001`

### 6️⃣ Instalar Dependências do Frontend

Abra um **novo terminal**, na raiz do projeto:
```bash
npm install
```

### 7️⃣ Configurar Variáveis de Ambiente do Frontend

Crie um arquivo `.env` na **raiz do projeto**:
```env
VITE_API_URL=http://localhost:3001/api
```

### 8️⃣ Iniciar o Frontend

No terminal da raiz:
```bash
npm run dev
```

Você deve ver algo como: `Local: http://localhost:5173/`

### ✅ Pronto!

Agora você pode:
- Acessar o site em: **http://localhost:5173**
- A API está em: **http://localhost:3001**
- Verificar a API em: **http://localhost:3001/health**

---

## 🐛 Solução de Problemas

### Erro ao conectar ao banco de dados
- Verifique se o Docker está rodando: `docker-compose ps`
- Verifique se o PostgreSQL está acessível
- Confira o `DATABASE_URL` no `.env`

### Porta já em uso
- Backend na porta 3001: Altere `PORT` no `server/.env`
- Frontend na porta 5173: O Vite escolhe automaticamente outra porta

### Erro de migrations
- Certifique-se de que o banco de dados está rodando
- Verifique as credenciais no `DATABASE_URL`

---

## 📝 Ordem dos Comandos (Resumo)

```bash
# Terminal 1: Backend
cd server
npm install
Copy-Item server.env .env  # Windows PowerShell
npm run db:migrate
npm run dev

# Terminal 2: Banco de Dados (se usar Docker)
docker-compose up -d

# Terminal 3: Frontend
npm install
# Criar .env na raiz com VITE_API_URL=http://localhost:3001/api
npm run dev
```

