# Chrono - Rede Social Temporal

Uma rede social moderna com interface cyberpunk, construída com React, TypeScript, Node.js e PostgreSQL.

## 🚀 Funcionalidades

- **Autenticação completa**: Registro, login, verificação de email, recuperação de senha
- **Timeline temporal**: Navegação por posts organizados por data
- **Posts interativos**: Texto, imagens, vídeos, threads, enquetes
- **Sistema de reações**: Reações cyberpunk (Glitch, Upload, Corrupt, Rewind, Static)
- **Sistema de seguidores**: Seguir/deixar de seguir usuários
- **Mensagens diretas**: Conversas privadas entre usuários
- **Notificações**: Sistema completo de notificações em tempo real
- **Perfis personalizáveis**: Temas, cores, efeitos visuais
- **Echo (Repost)**: Compartilhar posts de outros usuários

## 📁 Estrutura do Projeto

```
Chrono/
├── server/              # Backend API (Node.js + Express + PostgreSQL)
│   ├── src/
│   │   ├── db/         # Schema e migrations do banco de dados
│   │   ├── routes/     # Rotas da API
│   │   ├── services/   # Lógica de negócio
│   │   └── middleware/ # Middlewares (autenticação, etc)
│   └── package.json
├── components/          # Componentes React do frontend
├── services/           # Serviços do frontend (incluindo api.ts)
├── types.ts            # Tipos TypeScript compartilhados
└── package.json        # Dependências do frontend
```

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15+ (ou Docker)
- npm ou yarn

### 1. Configurar o Backend

```bash
cd server
npm install
```

Crie um arquivo `.env` na pasta `server/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chrono_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 2. Configurar o Banco de Dados

#### Opção A: Usando Docker (Recomendado)

```bash
docker-compose up -d
```

#### Opção B: PostgreSQL Local

Instale PostgreSQL e crie o banco:

```sql
CREATE DATABASE chrono_db;
```

### 3. Executar Migrations

```bash
cd server
npm run db:migrate
```

### 4. Iniciar o Backend

```bash
cd server
npm run dev
```

O servidor estará rodando em `http://localhost:3001`

### 5. Configurar o Frontend

Na raiz do projeto:

```bash
npm install
```

Crie um arquivo `.env` na raiz:

```env
VITE_API_URL=http://localhost:3001/api
```

### 6. Iniciar o Frontend

```bash
npm run dev
```

O frontend estará rodando em `http://localhost:5173` (ou a porta configurada no vite.config.ts)

## 📚 Uso da API

### Autenticação

Todas as requisições (exceto registro/login) precisam do token JWT no header:

```
Authorization: Bearer <token>
```

### Exemplos de Uso

#### Registrar Usuário
```bash
POST /api/auth/register
{
  "username": "usuario",
  "email": "usuario@example.com",
  "password": "senha123",
  "avatar": "https://example.com/avatar.jpg" (opcional)
}
```

#### Login
```bash
POST /api/auth/login
{
  "username": "usuario",
  "password": "senha123"
}
```

#### Criar Post
```bash
POST /api/posts
Authorization: Bearer <token>
{
  "content": "Meu primeiro post!",
  "imageUrl": "https://example.com/image.jpg" (opcional),
  "isPrivate": false
}
```

## 🔧 Scripts Disponíveis

### Backend
- `npm run dev` - Inicia servidor em modo desenvolvimento
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia servidor em produção
- `npm run db:migrate` - Executa migrations do banco

### Frontend
- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção

## 🗄️ Estrutura do Banco de Dados

O banco de dados inclui as seguintes tabelas principais:

- `users` - Usuários do sistema
- `posts` - Posts/tweets
- `reactions` - Reações aos posts
- `follows` - Relacionamentos de seguimento
- `conversations` - Conversas de mensagens diretas
- `messages` - Mensagens individuais
- `notifications` - Notificações do sistema
- `poll_votes` - Votos em enquetes

## 🔐 Segurança

- Senhas são hasheadas usando bcrypt
- Autenticação via JWT
- Validação de dados em todas as rotas
- Proteção contra SQL injection usando queries parametrizadas
- CORS configurado

## 📝 Notas

- O frontend atualmente usa localStorage para dados locais. Para usar completamente o backend, você precisará atualizar os componentes para usar o `apiClient` do `services/api.ts` ao invés do localStorage.
- As senhas são armazenadas como hash no banco de dados
- O sistema de verificação de email está implementado mas não envia emails reais (para produção, adicione um serviço de email)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT.
