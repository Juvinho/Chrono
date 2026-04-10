# 📜 Loose Scripts & Package Scripts Documentation

## Overview
This document comprehensively catalogs all temporary/one-shot scripts in the project root (A-10), server directory, and package.json scripts (A-11) that are not part of the standard build system.

---

## ROOT DIRECTORY - Configuration Scripts

### Build Configuration

#### `vite.config.ts`
- **Purpose**: Vite build configuration for React frontend  
- **Type**: Build system configuration
- **Status**: ✅ CRITICAL - Core build system
- **Modification**: Do not modify without thorough testing
- **Usage**: Automatically loaded during `npm run build` and `npm run dev`

#### `setupTests.ts`
- **Purpose**: Jest/Vitest test environment setup
- **Type**: Test framework configuration
- **Status**: ✅ REQUIRED - For test suite (see A-12)
- **Configuration**: Global test utilities and mocks
- **Usage**: Automatically loaded before tests run

---

## ROOT DIRECTORY - Development Launch Scripts

### `dev-server.bat` / `dev-server.ps1`
- **Purpose**: Launch Express.js backend development server
- **Type**: Platform-specific shell scripts
- **Status**: ✅ ACTIVE - For local development
- **Platforms**: Windows CMD (.bat) / PowerShell (.ps1)
- **Startup Port**: 5000 (configurable via SERVER_PORT env)
- **Environment**: NODE_ENV=development (auto-set)
- **Features**:
  - Watches for file changes
  - Auto-restarts on changes
  - Logs to console for debugging
- **Usage**:
  ```bash
  # Command Prompt
  dev-server.bat
  
  # PowerShell
  ./dev-server.ps1
  ```

### `start-dev.bat` / `start-dev.ps1`
- **Purpose**: Combined frontend + backend launcher
- **Type**: Convenience wrapper script  
- **Status**: ✅ ACTIVE - For local development
- **Platforms**: Windows CMD (.bat) / PowerShell (.ps1)
- **Frontend Port**: 5173 (Vite default)
- **Backend Port**: 5000 (Express)
- **Features**:
  - Spawns two separate terminal windows
  - Starts Vite dev server (frontend)
  - Starts Express server (backend)
  - Parallel execution
- **Usage**:
  ```bash
  # Command Prompt or PowerShell
  ./start-dev.ps1
  ```

---

## ROOT DIRECTORY - Administrative Scripts

### `privilégios_admin.js` (MISNAMED - Actually Dev Server)
- **Purpose**: Originally intended for admin management (naming misleading)
- **Current Function**: Alternative dev server launcher
- **Type**: Node.js JavaScript
- **Status**: ⚠️ CONFUSING NAME - Consider renaming or deleteion
- **Features**:
  - Spawns Express backend
  - Spawns Vite frontend
  - Cross-platform compatible
- **Recommendation**: Use `dev-server.bat` or `start-dev.bat` instead
- **Future Action**: Rename to `dev-server-legacy.js` or delete

### `update_display_name.js`
- **Purpose**: One-shot database migration script
- **Type**: Node.js JavaScript utility
- **Status**: ✅ COMPLETED - Successfully migrated user display_names to Railway
- **Last Execution**: February 2026
- **Functionality**:
  - Populates `display_name` field for all users
  - Sets `display_name = username` where NULL/empty
  - Provides verification and summary statistics
- **When to Use**: NEVER (already executed successfully)
- **Future Action**: Safe to delete - migration complete
- **Command** (DO NOT RUN):
  ```bash
  node update_display_name.js  # ⚠️ Already completed
  ```

---

## ROOT DIRECTORY - Email & Configuration Testing

### `smtp.py`
- **Purpose**: Test and configure SMTP email settings (Python)
- **Type**: Python 3 utility script
- **Status**: ⛔ **DEPRECATED** - Use `server/_test_email.mjs` (Node.js equivalent)
- **Security Issue**: ❌ Contains hardcoded credentials in source
- **Language**: Python 3.x
- **Current Replacement**: `server/_test_email.mjs` and `server/test-gmail.js`
- **Usage** (DEPRECATED):
  ```bash
  python smtp.py  # ⛔ Do not use
  ```
- **New Approach**:
  ```bash
  # Use Node.js version instead
  node server/test-gmail.js
  node server/_test_email.mjs
  ```
- **Recommendation**: **DELETE** - Security risk, functionality replaced

---

## SERVER DIRECTORY - Database Management Scripts

### `reset-db.ts`
- **Purpose**: Reset database schema to clean/initialized state
- **Type**: TypeScript utility (runs via ts-node)
- **Status**: ✅ DEVELOPMENT ONLY
- **Danger Level**: 🔴 **HIGH** - Deletes ALL data
- **Features**:
  - Drops all existing tables
  - Recreates fresh schema
  - Initializes default/seed data
  - Clears all user data, posts, conversations
- **When to Use** (Development ONLY):
  - Starting fresh development
  - Resolving schema conflicts
  - Testing database migrations
  - **NEVER in production**
- **Command**:
  ```bash
  npx ts-node server/reset-db.ts
  ```
- **Warning**: ⛔ This operation is IRREVERSIBLE

### `test-db.ts`
- **Purpose**: Verify database connection and schema integrity
- **Type**: TypeScript diagnostic utility
- **Status**: ✅ SAFE - Read-only operations
- **Features**:
  - Test database connectivity
  - Verify table creation
  - Validate schema constraints
  - Check basic CRUD operations
- **When to Use**:
  - Troubleshoot database connection issues
  - Verify schema after migrations
  - Diagnose connection problems
- **Command**:
  ```bash
  npx ts-node server/test-db.ts
  ```
- **Safety**: Safe to run anytime - no modifications

---

## SERVER DIRECTORY - Email Testing Scripts

### `test-gmail.js`
- **Purpose**: Test Gmail SMTP connection and email delivery
- **Type**: Node.js JavaScript utility
- **Status**: ✅ ACTIVE - For development/debugging
- **Features**:
  - Test SMTP connection to Gmail
  - Verify authentication credentials
  - Send test email message
  - Display connection logs
- **Environment Requirements**:
  ```env
  GMAIL_USER=your-email@gmail.com
  GMAIL_PASS=your-app-password  # NOT your regular Gmail password!
  ```
- **Note**: Gmail requires "App Password", not regular account password
- **Command**:
  ```bash
  node server/test-gmail.js
  ```
- **Safety**: ✅ Safe - only reads config, sends test email

### `_test_email.mjs`
- **Purpose**: Modern ES modules email testing utility
- **Type**: Node.js ES module (`.mjs` extension)
- **Status**: ✅ ACTIVE - For development/debugging
- **Features**:
  - Modern async/await patterns
  - ES6+ JavaScript syntax
  - Comprehensive error logging
  - Email delivery testing
- **Node Version**: Requires Node.js 14+
- **Command**:
  ```bash
  node server/_test_email.mjs
  ```
- **Advantage**: Cleaner ES module syntax vs CommonJS
- **Safety**: ✅ Safe - testing utility only

---

## SERVER DIRECTORY - Build & Asset Management

### `copy-assets.js`
- **Purpose**: Copy static assets from source to build output directory
- **Type**: Node.js JavaScript build utility
- **Status**: ✅ AUTOMATIC - Managed by build process
- **Integration**: Called during `npm run build` pipeline
- **Features**:
  - Copies public/ files to dist/
  - Preserves directory structure
  - Handles binary files (images, etc.)
  - Reports copy summary
- **Manual Execution**:
  ```bash
  node server/copy-assets.js
  ```
- **When Failing**:
  - Check file permissions
  - Verify disk space availability
  - Ensure source/dest paths exist

---

## ROOT DIRECTORY - Legacy Test Scripts

### `test-bio-system.sh`
- **Purpose**: Legacy bash script for bio system testing
- **Type**: Bash shell script (.sh)
- **Status**: ⛔ **DEPRECATED** - Replaced by Vitest
- **Platform**: Linux/macOS only (bash interpreter required)
- **Current Replacement**: `npm test` (Vitest test suite)
- **Functionality**:
  - Tests bio generation endpoints
  - Validates response format
  - Legacy shell scripting approach
- **Why Deprecated**: Modern test framework (Vitest) provides better testing
- **Usage** (DEPRECATED):
  ```bash
  ./test-bio-system.sh  # ⛔ Do not use
  ```
- **New Approach**:
  ```bash
  npm test
  ```
- **Recommendation**: **DELETE** - Functionality replaced by Vitest

---

---

## 📋 PACKAGE.JSON SCRIPTS (A-11)

### Frontend Scripts (`package.json` in root)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview", 
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  }
}
```

| Script | Command | Purpose | When to Use |
|--------|---------|---------|-----------|
| `dev` | `npm run dev` | Start Vite dev server | Local development (port 5173) |
| `build` | `npm run build` | Full production build | Before deployment, CI/CD |
| `preview` | `npm run preview` | Preview production bundle | Test production build locally |
| `lint` | `npm run lint` | Run ESLint static analysis | Code quality checks |
| `type-check` | `npm run type-check` | TypeScript type validation | Find type errors without building |

### Backend Scripts (`server/package.json`)

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

| Script | Command | Purpose | When to Use |
|--------|---------|---------|-----------|
| `start` | `npm start` (in server/) | Start production server | Deployment, production environment |
| `dev` | `npm run dev` (in server/) | Start TypeScript dev server | Local development with auto-reload |
| `build` | `npm run build` (in server/) | Compile TypeScript to JavaScript | Build for production |
| `test` | `npm test` (in server/) | Run test suite | CI/CD validation, before commit |
| `test:watch` | `npm run test:watch` | Watch mode testing | TDD development workflow |

---

## 🚀 RECOMMENDED DEVELOPMENT WORKFLOW  

### 1. Initial Setup
```bash
# Install all dependencies
npm install
cd server && npm install && cd ..

# Create environment files
cp .env.example .env
# Edit .env with your settings

# Initialize fresh database (dev only)
npx ts-node server/reset-db.ts

# Verify database connectivity
npx ts-node server/test-db.ts
```

### 2. Daily Development
```bash
# Option A: Run services separately (better for debugging)
npm run dev              # Terminal 1: Frontend dev server
cd server && npm run dev # Terminal 2: Backend dev server

# Option B: Combined launcher (all-in-one)
./start-dev.ps1         # Starts both with one command
```

### 3. Email Configuration Testing
```bash
# Set up Gmail App Password in .env
# Then test connection
node server/test-gmail.js

# Or test with ES modules
node server/_test_email.mjs
```

### 4. Before Deployment
```bash
# Type check everything
npm run type-check

# Run tests
npm test
cd server && npm test

# Build production bundle
npm run build

# Test production build locally
npm run preview
```

---

## 🔐 SECURITY BEST PRACTICES

### ❌ DO NOT
- Commit `.env` files with real credentials
- Hardcode passwords in scripts (like `smtp.py` does)
- Run administrative scripts carelessly
- Use `reset-db.ts` in production
- Run scripts with elevated privileges unnecessarily
- Share database credentials

### ✅ DO
- Always backup database before running maintenance scripts
- Use environment variables (`.env`) for sensitive data
- Log administrative script executions
- Review script code before running
- Test scripts in development first
- Use `.env.example` template for config structure
- Add scripts to `package.json` "scripts" section instead of loose files

---

## 📊 SCRIPTS INVENTORY & STATUS

| Script | Language | Type | Status | Action | Risk |
|--------|----------|------|--------|--------|------|
| `vite.config.ts` | TypeScript | Build config | ✅ Active | Keep | 🟡 Medium |
| `setupTests.ts` | TypeScript | Test config | ✅ Active | Keep | 🟢 Low |
| `dev-server.bat` | Batch | Dev launcher | ✅ Active | Keep | 🟢 Low |
| `dev-server.ps1` | PowerShell | Dev launcher | ✅ Active | Keep | 🟢 Low |
| `start-dev.bat` | Batch | Dev launcher | ✅ Active | Keep | 🟢 Low |
| `start-dev.ps1` | PowerShell | Dev launcher | ✅ Active | Keep | 🟢 Low |
| `privilégios_admin.js` | JavaScript | Dev launcher | ⚠️ Confusing | Delete/Rename | 🟢 Low |
| `update_display_name.js` | JavaScript | Migration | ✅ Completed | Delete | 🟢 Low |
| `smtp.py` | Python | Email test | ⛔ Deprecated | Delete | 🔴 High |
| `test-bio-system.sh` | Bash | Test suite | ⛔ Deprecated | Delete | 🟢 Low |
| `reset-db.ts` | TypeScript | DB utility | ✅ Dev-only | Keep | 🔴 High |
| `test-db.ts` | TypeScript | DB utility | ✅ Safe | Keep | 🟢 Low |
| `test-gmail.js` | JavaScript | Email test | ✅ Active | Keep | 🟢 Low |
| `_test_email.mjs` | JavaScript | Email test | ✅ Active | Keep | 🟢 Low |
| `copy-assets.js` | JavaScript | Build util | ✅ Automatic | Keep | 🟢 Low |

---

## 🗑️ CLEANUP RECOMMENDATIONS

### Immediate (Safe to DELETE)
```bash
# Already completed migration
rm -f update_display_name.js

# Deprecated test script
rm -f test-bio-system.sh

# Security risk - deprecated
rm -f smtp.py
```

### After Review
```bash
# Confusing name - either rename or delete
rm -f privilégios_admin.js
# OR rename:
mv privilégios_admin.js dev-server-legacy.js
```

### Keep These
- All `.ts`, `.ps1`, `.bat` files in root
- `server/reset-db.ts`, `test-db.ts`
- `server/test-gmail.js`, `_test_email.mjs`
- `server/copy-assets.js`

---

## 📝 FUTURE SCRIPT BEST PRACTICES

For any new maintenance/utility scripts:

1. **Place in organized location**:
   - `server/scripts/` for backend utilities
   - `scripts/` for frontend utilities
   - NOT in project root

2. **Add to `package.json`**:
   ```json
   {
     "scripts": {
       "reset-db": "ts-node server/scripts/reset-db.ts"
     }
   }
   ```

3. **Document**:
   - Add inline comments in the script
   - Document in `SCRIPTS_DOCUMENTATION.md`
   - Add usage examples

4. **Security**:
   - Never hardcode credentials
   - Use `.env` environment variables
   - Add to `.gitignore` if needed

5. **Cleanup**:
   - Remove after one-time execution, OR
   - Keep with execution date archived
   - Document when it was last run

---

**Documentation Status**: ✅ A-10 & A-11 Complete
**Last Updated**: April 8, 2026
**Next Review**: After next major version release
- See `server/.env.example` for proper email configuration

---

## Related Documentation
- **Development Setup**: See `SETUP.md` in project root
- **Dev Server**: `DEV_SERVER_README.md`
- **Email Config**: `SETUP_EMAIL_GMAIL.md`
- **Node Scripts**: `server/package.json` (scripts section)
