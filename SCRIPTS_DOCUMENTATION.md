# 📜 Loose Scripts Documentation (A-10)

## Overview
This document catalogs all temporary/one-shot scripts in the project root that are not part of the standard build system.

---

## 🔴 DEPRECATED / DELETE CANDIDATES

### `smtp.py`
- **Purpose**: Python SMTP email testing utility
- **Status**: ⚠️ DEPRECATED - Use Node.js `server/_test_email.mjs` instead
- **Language**: Python 3
- **Credentials**: ⚠️ SECURITY ISSUE - Contains hardcoded email credentials in source
- **Recommendation**: **DELETE** - Replaced by server-side email service
- **Last Used**: Testing email configuration (Feb 2026)
- **Files to Keep**: `server/_test_email.mjs` (Node.js equivalent)

```bash
# Old way (DEPRECATED):
python smtp.py

# New way:
node server/_test_email.mjs
```

---

## 🟡 TEMPORARY / ONE-SHOT MIGRATIONS

### `update_display_name.js`
- **Purpose**: One-shot database migration script
- **Status**: ✅ COMPLETED - Ran successfully on Railway
- **Description**: 
  - Populates `display_name` column for all users
  - Sets `display_name = username` where NULL or empty
  - Provides verification and summary statistics
- **When to Use**: Never (already executed during Railway migration)
- **Cleanup**: Safe to delete after verification
- **Command**:
  ```bash
  node update_display_name.js
  ```

**Sample Output**:
```
✓ Updated 47 users with display_name
✓ Summary:
  - total_users: 47
  - with_display_name: 47
✓ Done!
```

---

## 🟠 MISNAMED / CONFUSING LOCATION

### `privilégios_admin.js` (Should be `dev-server-old.js`)
- **Purpose**: Alternative dev server starter (older version)
- **Status**: ⚠️ REPLACED - Use `dev-server.bat` or `start-dev.bat` instead
- **Description**:
  - Spawns Express backend (port 3001) + Vite frontend (port 5173)
  - Automatically opens browser
  - Full dev environment setup
- **Current Solution**: `dev-server.bat` (PowerShell equivalent)
- **Platform**: Cross-platform Node.js (works on Windows/Mac/Linux)
- **Why Confusing**: Name suggests admin privileges, but it's actually a dev server starter
- **Recommendation**: Rename to `dev-server-legacy.js` or delete (superseded by `.bat` files)

**Current Alternative Commands**:
```bash
# Windows:
./dev-server.bat
./start-dev.bat

# PowerShell:
./dev-server.ps1
./start-dev.ps1
```

---

## 🔵 SHELL SCRIPTS (Build/Test Utilities)

### `test-bio-system.sh`
- **Purpose**: Test bio system functionality (legacy bash script)
- **Status**: ⚠️ DEPRECATED - Integration tests now in vitest
- **Platform**: Linux/Mac only (bash)
- **Description**:
  - Tests bio generation endpoints
  - Validates response format
  - Legacy testing approach (shell scripting)
- **Current Solution**: Vitest test suite at `src/__tests__/`
- **Recommendation**: Delete - use `npm test` instead

```bash
# Old way (DEPRECATED):
./test-bio-system.sh

# New way:
npm test
```

---

## 📋 Summary Table

| Script | Purpose | Status | Action |
|--------|---------|--------|--------|
| `smtp.py` | Email testing | ❌ DEPRECATED | Delete |
| `privilégios_admin.js` | Dev server | ⚠️ REPLACED | Rename/Delete |
| `update_display_name.js` | DB migration | ✅ COMPLETED | Delete |
| `test-bio-system.sh` | Bio tests | ❌ DEPRECATED | Delete |

---

## 🗑️ Cleanup Recommendations

### Immediate (Safe to Delete NOW)
```bash
rm -f update_display_name.js
rm -f test-bio-system.sh
```

### After Review (Safe to Delete)
```bash
rm -f smtp.py
mv privilégios_admin.js dev-server-legacy.js  # OR delete
```

### Current Standard Practice
For future one-shot scripts:
1. Place in `server/scripts/` or `scripts/` directory
2. Add to `server/package.json` under `"scripts"` section
3. Document in `SCRIPTS.md` or in-code comments
4. Remove after successful execution, OR keep with archived date

---

## Environment Files

### Current Secure Approach
- Never commit credentials to `.js` or `.py` files
- Use `.env` or `.env.local` for sensitive data
- `.env.example` shows structure without credentials

### Legacy Security Issue
`smtp.py` contains hardcoded credentials (⛔ **SECURITY RISK**)
- Should never be committed to version control
- Recommend immediate deletion
- See `server/.env.example` for proper email configuration

---

## Related Documentation
- **Development Setup**: See `SETUP.md` in project root
- **Dev Server**: `DEV_SERVER_README.md`
- **Email Config**: `SETUP_EMAIL_GMAIL.md`
- **Node Scripts**: `server/package.json` (scripts section)
