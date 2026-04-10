# 🚀 Dev Server - Starter Scripts

Scripts para iniciar o desenvolvimento do Chrono de forma fácil.

## 📋 Opção 1: Arquivo .bat (Recomendado para Windows)

```bash
.\dev-server.bat
```

**O que faz:**
- Abre terminal 1 com Backend (3001)
- Abre terminal 2 com Frontend (5173)
- Abre navegador automaticamente
- Mostra informações de acesso

## 📋 Opção 2: PowerShell Script

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File dev-server.ps1
```

**O que faz:**
- Mesmo que o .bat mas com mais controle

## 📋 Opção 3: Manual (Já existente)

Terminal 1 - Backend:
```bash
npm --prefix server run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Depois abra: http://localhost:5173

---

## 🌐 Acessos Rápidos

| Recurso | URL |
|---------|-----|
| **Aplicação** | http://localhost:5173 |
| **Admin Panel** | http://localhost:5173/admin/login |
| **Backend API** | http://localhost:3001 |
| **Health Check** | http://localhost:3001/health |

---

## 🔐 Credenciais Padrão

**Admin Password:**
```
AdminMaster2026!@#$secure
```

⚠️ **MUDE ISTO EM PRODUÇÃO!** Edite `.env`

---

## 📊 Logs

Cada terminal mostra seus próprios logs em tempo real:

**Terminal 1 (Backend):**
```
✅ Server running on port 3001
🔐 Admin config loaded successfully
📦 Database connected
```

**Terminal 2 (Frontend):**
```
VITE v6.4.1 dev server running at:
➜  http://localhost:5173/
```

---

## 🛠️ Troubleshooting

### Portas já em uso?

**Backend (3001):**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Frontend (5173):**
```bash
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Erro de permissão no PowerShell?

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\dev-server.ps1
```

### Alternativamente, desabilitar permissão:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File dev-server.ps1
```

---

## 🎯 Fluxo de Desenvolvimento

1. **Rodar dev-server.bat**
2. Dois terminais abrem automaticamente
3. Navegador abre em http://localhost:5173
4. Fazer mudanças no código
5. Vite/Node recompilam automaticamente ♻️
6. Refresh no navegador para ver mudanças (HMR ativado)

---

## 📝 Dicas

- **Backend recompila:** Qualquer mudança em `server/src`
- **Frontend recompila:** Qualquer mudança em `src`
- **Logs em tempo real:** Veja ambos os terminais
- **Ctrl+C:** Para para ambos os servidores (use nos terminais)

---

## 🚀 Próximo Passo

Acesse o Admin Panel:
```
http://localhost:5173/admin/login
```

Senha: `AdminMaster2026!@#$secure`

---

**Criado em:** Feb 7, 2026  
**Versão:** 1.0  
**Sistema:** Windows/PowerShell
