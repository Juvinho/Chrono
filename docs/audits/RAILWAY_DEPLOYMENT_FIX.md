# 🚀 Railway Deployment Guide - Chrono Backend

## ⚠️ Current Issue: JWT_SECRET Configuration Missing

**Symptom**: Container restarts infinitely with error:
```
Error: CRITICAL: JWT_SECRET too short. Minimum 32 characters required.
```

**Root Cause**: `JWT_SECRET` environment variable not set in Railway or set to invalid value.

**Solution**: Follow this guide to configure Railway properly.

---

## 📋 Prerequisites

- Railway account with active service for Chrono backend
- PostgreSQL database provisioned
- Admin access to Railway dashboard

---

## ✅ Step 1: Generate Secure JWT_SECRET

Open your terminal and generate a 64-character random secret:

### Linux/Mac:
```bash
openssl rand -hex 32
# Output example: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

### Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | ForEach-Object { $_ -replace '\+', '-' -replace '/', '_' -replace '=' }
```

### Node.js (Any OS):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - you'll need to paste it in Railway.

---

## 🔧 Step 2: Add JWT_SECRET to Railway

1. **Log in** to [railway.app](https://railway.app)

2. **Navigate** to your Chrono service

3. **Go to** Settings → Variables (or Variables tab)

4. **Click** "New Variable" or paste the environment variable

5. **Enter**:
   - **Key**: `JWT_SECRET`
   - **Value**: `<paste-your-64-char-hex-string-here>`

6. **Verify** the value has at least 32 characters (will be 64 for hex format)

7. **Click** Save

Example:
```
Key: JWT_SECRET
Value: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

---

## 🌍 Step 3: Verify Other Required Variables

In Railway Variables, confirm you have ALL of these set:

| Variable | Required | Min Length | Notes |
|----------|----------|------------|-------|
| `JWT_SECRET` | ✅ YES | 32 chars | Must be 32+ random chars |
| `DATABASE_URL` | ✅ YES | N/A | Auto-set by Railway if PostgreSQL is linked |
| `NODE_ENV` | ❌ NO | N/A | Defaults to `development` if not set |
| `ADMIN_JWT_SECRET` | ❌ NO | 32 chars | Optional; admin panel disabled if not set |
| `ADMIN_PASSWORD_HASH` | ❌ NO | N/A | Optional; admin panel disabled if not set |
| `SMTP_HOST` | ❌ NO | N/A | Optional; email features disabled if not set |
| `GEMINI_API_KEY` | ❌ NO | N/A | Optional; AI features return error if not set |

---

## 🔄 Step 4: Redeploy Service

After adding `JWT_SECRET`:

1. **Go to** your Chrono service in Railway

2. **Click** Deployments (left sidebar)

3. **Select** the latest deployment

4. **Click** the ⋮ menu → "Redeploy"

5. **Wait** for the deployment to complete (2-5 minutes)

6. **Check** logs: Click "Logs" tab and look for:
   ```
   ✅ JWT_SECRET validated (length: 64, sample: a1b2c3d4...a1b2)
   ```

---

## ✅ Verification Steps

### Locally (Before Railway Deploy)

1. **Generate secret**:
   ```bash
   openssl rand -hex 32
   ```

2. **Test with local `.env`**:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env and replace JWT_SECRET with your generated value
   npm run build
   npm run dev
   ```

3. **Expected output**:
   ```
   ✅ JWT_SECRET validated (length: 64, sample: a1b2c3d4...xyz9)
   Server running on http://0.0.0.0:3001
   ```

### In Railway

1. **Check Logs**:
   - Navigate to your service
   - Click "Logs" tab
   - Look for: `✅ JWT_SECRET validated`

2. **Test API Endpoint**:
   ```bash
   curl https://<your-railway-url>/health
   # Should return 200 OK (or similar success response)
   ```

3. **Monitor for Errors**:
   - If you see `CRITICAL: JWT_SECRET`, check that your Railway variable was saved
   - If you see database errors, check that `DATABASE_URL` is properly linked

---

## ❌ Troubleshooting

### Error: "JWT_SECRET too short"

**Cause**: Secret is less than 32 characters

**Fix**:
1. Generate new secret: `openssl rand -hex 32` (produces 64 chars)
2. Verify length in Railway Variables (should show full value)
3. Redeploy

### Error: "default insecure value"

**Cause**: Still using default example value

**Fix**:
1. Confirm you replaced `your-super-secret-jwt-key-change-this-in-production-12345` with random value
2. Check Railway Variables again
3. Redeploy

### Container keeps restarting

**Cause**: Application startup fails due to missing JWT_SECRET

**Fix**:
1. Check Railway Logs for exact error message
2. Go to Variables and add `JWT_SECRET` if missing
3. Verify no typos in key name (case-sensitive: `JWT_SECRET`)
4. Redeploy

### PostgreSQL Warning: "no unique constraint matching ON CONFLICT"

**Cause**: Fixed in v2 - schema.sql now properly specifies `ON CONFLICT (column)`

**Solution**:
1. Pull latest code (schema.sql already fixed)
2. Rerun migrations
3. Redeploy

---

## 📝 Environment Variable Checklist

- [ ] Generated secure `JWT_SECRET` (64char hex string)
- [ ] Added `JWT_SECRET` to Railway Variables
- [ ] Verified `DATABASE_URL` is automatically linked
- [ ] (Optional) Added `ADMIN_JWT_SECRET` if using admin panel
- [ ] (Optional) Added `ADMIN_PASSWORD_HASH` if using admin panel
- [ ] (Optional) Added `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` if using email
- [ ] Clicked "Redeploy" after adding/modifying variables
- [ ] Checked logs for `✅ JWT_SECRET validated`
- [ ] Tested API endpoint for 2xx response

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Environment Variables Guide](https://docs.railway.app/reference/environment-variables)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

## 🔐 Security Reminders

✅ **DO**:
- Keep `JWT_SECRET` secret
- Use different secrets for dev/staging/production
- Rotate secrets regularly
- Use random, 32+ character values
- Store secrets in Railway Variables (not in code)

❌ **DON'T**:
- Commit `.env` files to git
- Use default example values in production
- Share JWT_SECRET in logs or anywhere public
- Use short or predictable secrets
- Reuse same secret across environments

---

Generated: April 8, 2026
Status: Complete deployment guide for Chrono backend
