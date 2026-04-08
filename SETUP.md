# 🚀 Chrono Development Setup Guide (A-11)

Complete guide for setting up the Chrono social network development environment.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Database Commands](#database-commands)
5. [Available Scripts](#available-scripts)
6. [Troubleshooting](#troubleshooting)
7. [Environment Configuration](#environment-configuration)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v14+ (local or remote)
- **Git**: v2.x or higher

### Recommended Tools
- **VS Code**: Code editor with TypeScript support
- **Postman**: API testing
- **DBeaver**: Database client (optional)
- **PowerShell 7+**: For better terminal experience (Windows)

### Check Installation
```bash
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # psql 14+
git --version     # git version 2.x
```

---

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/Juvinho/Chrono.git
cd Chrono
```

### 2. Install Dependencies

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd server
npm install
cd ..
```

### 3. Configure Environment Variables

#### Root `.env.example` → `.env.local`
```bash
cp .env.example .env.local
```

**Key Variables**:
- `VITE_API_URL`: Backend API URL (default: `http://localhost:3001`)
- `VITE_SOCKET_URL`: WebSocket URL (default: `http://localhost:3001`)

#### `server/.env.example` → `server/.env`
```bash
cp server/.env.example server/.env
```

**Key Variables**:
- `PORT`: Backend port (default: `3001`)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing (min 32 chars)
- `HCAPTCHA_SECRET`: hCaptcha verification key (optional)

### 4. Setup Database

#### Create Database (if needed)
```bash
createdb chrono_dev
```

#### Run Migrations
```bash
npm run db:migrate
```

#### Seed Sample Data (optional)
```bash
npm run db:seed
```

---

## Development Workflow

### Quick Start (All-in-One)

#### Windows (PowerShell)
```bash
./dev-server.ps1
```

#### Windows (CMD/Batch)
```bash
dev-server.bat
```

#### Mac/Linux
```bash
npm run dev  # From root (backend + frontend in parallel)
```

This:
1. ✅ Starts Express backend on `http://localhost:3001`
2. ✅ Starts Vite frontend on `http://localhost:5173`
3. ✅ Auto-opens browser at `http://localhost:5173`
4. ✅ Watches for file changes (hot reload)

### Separate Terminals (Advanced)

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
# Output: Server running on http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
npm run dev
# Output: Frontend running on http://localhost:5173
```

### Development Guidelines
- ✅ Use `nx` for monorepo management (planned)
- ✅ TypeScript strict mode enabled
- ✅ ESLint + Prettier for code formatting
- ✅ Hot reload enabled for both frontend/backend
- ⚠️ Never commit `.env` files

---

## Database Commands

All database commands run from project root or inside `server/` directory.

### Migrations
```bash
# Run pending migrations
npm run db:migrate

# Generate new migration (if using migration framework)
npm run db:migrate:create -- --name "add_new_table"
```

### Data Operations
```bash
# Migrate data from old schema
npm run db:migrate-data

# Seed database with sample data
npm run db:seed

# Clear all data (CAUTION: destructive)
npm run db:clear

# Backup database
npm run db:backup
```

### User Management
```bash
# Sync follow relationships
npm run db:sync-follows

# Update all user bios/tags
npm run update-user-tags

# Fix encrypted schema (utility)
npm run db:fix-encrypted
```

---

## Available Scripts

### Root Directory (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -p server/tsconfig.json",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run dev` | Start Vite dev server | Frontend on :5173 |
| `npm run build` | Production build | `dist/` folder |
| `npm run preview` | Preview production build locally | Preview on :4173 |
| `npm run test` | Run Vitest test suite | Test results |
| `npm run lint` | Check code style | Linting errors |
| `npm run type-check` | TypeScript type checking | Type errors |

### Backend Server Scripts (`server/package.json`)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && node copy-assets.js",
    "start": "node dist/index.js",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:seed": "tsx src/db/seed.ts",
    "db:clear": "tsx src/db/clear.ts",
    "db:backup": "tsx src/scripts/backup.ts",
    "update-user-tags": "tsx src/scripts/updateAllUserBios.ts"
  }
}
```

| Command | Purpose | Notes |
|---------|---------|-------|
| `npm run dev` | Start dev server with auto-reload | Uses tsx watcher |
| `npm run build` | Compile TypeScript to JavaScript | Output: `dist/` |
| `npm run start` | Run compiled backend | Production use |
| `npm run db:migrate` | Run database migrations | Idempotent |
| `npm run db:seed` | Insert sample data | For testing |
| `npm run db:clear` | Drop all tables | ⚠️ DESTRUCTIVE |
| `npm run update-user-tags` | Update user bios | One-shot utility |

---

## Build & Deployment

### Development Build
```bash
npm run build
# Output: dist/ folder (frontend) + server/dist/ folder (backend)
```

### Production Build
```bash
# Full build (no watch mode)
npm run build

# Check bundle size
npm run preview
```

### Docker Deployment
```bash
# Build Docker image
docker build -t chrono:latest .

# Run container
docker run -p 3001:3001 -e DATABASE_URL=... chrono:latest
```

---

## Troubleshooting

### Port Already in Use
```bash
# Windows (find process on port 3001)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL service
sudo systemctl status postgresql  # Linux
brew services list               # Mac
Get-Service postgres             # Windows
```

### Dependencies Mismatch
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
cd server && npm install && cd ..
```

### TypeScript Errors
```bash
# Full type check
npm run type-check

# With verbose output
npx tsc --noEmit --listFiles
```

---

## Environment Configuration

### `.env.local` (Frontend)
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_DEBUG=true
VITE_HCAPTCHA_SITEKEY=xxx
VITE_ENABLE_ANALYTICS=false
```

### `server/.env` (Backend)
```env
# Server
PORT=3001
NODE_ENV=development
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chrono_dev

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
HCAPTCHA_SECRET=xxx

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin (Optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

### Security Notes
⚠️ **NEVER commit `.env` files to Git**
- Use `.env.example` for templates
- Each developer has their own `.env.local` and `server/.env`
- Production uses environment variables (hosting provider)

---

## Useful Development Tips

### Hot Reload
Both frontend and backend support file watching:
- Edit `.tsx`/`.ts` → Auto-compiles and hot-reloads
- No need to restart server manually
- Browser page auto-refreshes

### TypeScript Strict Mode
```bash
# Check strict type safety
npx tsc --noEmit --strict
```

### Database Queries
```bash
# Interactive PostgreSQL shell
psql $DATABASE_URL

# Sample query
SELECT username, email, created_at FROM users LIMIT 10;
```

### API Testing
```bash
# Using curl
curl http://localhost:3001/api/users

# Using Postman
# Import: server/api/routes/*.ts for documentation
# Set header: Authorization: Bearer <YOUR_JWT_TOKEN>
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/`)
- Runs on every push to `main`
- Tests pass required checks
- Docker image pushed to registry

### Pre-commit Checks
```bash
# Run before committing
npm run type-check
npm run lint
npm test
```

---

## Getting Help

### Resources
- 📖 **API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 📋 **Database Schema**: [server/migrations/](./server/migrations/)
- 📝 **Project Status**: [AUDIT_FINAL_STATUS_2026-04-08.md](./AUDIT_FINAL_STATUS_2026-04-08.md)
- 🐛 **Troubleshooting**: [TROUBLESHOOTING_EMAIL.md](./TROUBLESHOOTING_EMAIL.md)

### Common Issues Docs
- Email Setup: [SETUP_EMAIL_GMAIL.md](./SETUP_EMAIL_GMAIL.md)
- Backend Start: [INICIAR_BACKEND.md](./INICIAR_BACKEND.md)
- Docker: [INICIAR_DOCKER.md](./INICIAR_DOCKER.md)

### Community
- **GitHub Issues**: [Report bugs](https://github.com/Juvinho/Chrono/issues)
- **Discussions**: [Ask questions](https://github.com/Juvinho/Chrono/discussions)

---

## Quick Reference Map

```
Chrono Project Structure
├── src/                    # Frontend React code
│   ├── features/          # Feature modules (timeline, profile, etc)
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Global CSS/animations
├── server/                # Backend Express API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database layer
│   │   └── scripts/       # Utility scripts
│   ├── migrations/        # Database migration files
│   └── dist/              # Compiled backend (generated)
├── dist/                  # Built frontend (generated)
├── docs/                  # Documentation
└── docker-compose.yml     # Local Docker setup
```

---

## Changelog

**Latest**: A-11 Documentation (April 8, 2026)
- Created comprehensive SETUP.md
- Added server scripts documentation  
- Added troubleshooting guide
- Environment configuration templates

See [AUDIT_FINAL_STATUS_2026-04-08.md](./AUDIT_FINAL_STATUS_2026-04-08.md) for complete audit status.
