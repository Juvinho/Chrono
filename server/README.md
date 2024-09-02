# Chrono Backend API

Backend API para a rede social Chrono, construída com Node.js, Express, TypeScript e PostgreSQL.

## Pré-requisitos

- Node.js 18+ 
- PostgreSQL 15+ (ou use Docker)
- npm ou yarn

## Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente. Crie um arquivo `.env` na pasta `server/` com:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chrono_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email Configuration (SMTP) - Para envio de emails de verificação
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Nota sobre Email:** Para usar Gmail, você precisará gerar uma "App Password" nas configurações da sua conta Google. Em desenvolvimento, se o email falhar, o registro continuará funcionando, mas o usuário precisará verificar manualmente.

3. Inicie o banco de dados PostgreSQL (usando Docker):
```bash
docker-compose up -d
```

Ou configure um banco PostgreSQL local e atualize `DATABASE_URL` no `.env`.

4. Execute as migrations:
```bash
npm run db:migrate
```

## Executando o Servidor

### Desenvolvimento
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3001`

### Produção
```bash
npm run build
npm start
```

## Estrutura do Projeto

```
server/
├── src/
│   ├── db/              # Configuração do banco de dados
│   │   ├── connection.ts
│   │   ├── schema.sql
│   │   └── migrate.ts
│   ├── middleware/      # Middlewares (auth, etc)
│   ├── routes/          # Rotas da API
│   ├── services/        # Lógica de negócio
│   ├── types/           # Tipos TypeScript
│   └── index.ts         # Ponto de entrada
├── package.json
└── tsconfig.json
```

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/verify` - Verificar conta
- `POST /api/auth/forgot-password` - Solicitar reset de senha
- `POST /api/auth/reset-password` - Resetar senha
- `GET /api/auth/me` - Obter usuário atual

### Usuários
- `GET /api/users/:username` - Obter usuário por username
- `PUT /api/users/:username` - Atualizar perfil
- `POST /api/users/:username/follow` - Seguir/Deixar de seguir

### Posts
- `GET /api/posts` - Listar posts
- `GET /api/posts/:id` - Obter post específico
- `POST /api/posts` - Criar novo post
- `PUT /api/posts/:id` - Atualizar post
- `DELETE /api/posts/:id` - Deletar post
- `POST /api/posts/:id/reactions` - Adicionar reação
- `POST /api/posts/:id/vote` - Votar em enquete

### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/with/:username` - Obter ou criar conversa
- `POST /api/conversations/:id/messages` - Enviar mensagem
- `POST /api/conversations/:id/read` - Marcar como lida

### Notificações
- `GET /api/notifications` - Listar notificações
- `PUT /api/notifications/:id/read` - Marcar como lida
- `POST /api/notifications/read-all` - Marcar todas como lidas

## Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Após fazer login ou registrar, você receberá um token que deve ser incluído no header:

```
Authorization: Bearer <token>
```

## Banco de Dados

O schema está definido em `src/db/schema.sql`. Execute as migrations para criar as tabelas:

```bash
npm run db:migrate
```

