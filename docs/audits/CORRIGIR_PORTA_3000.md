# ✅ Correção da Porta 3000 - CORS

## 🔧 O que foi corrigido:

O backend agora aceita requisições de **ambas as portas**:
- `http://localhost:3000` (sua porta atual)
- `http://localhost:5173` (porta padrão do Vite)

## 🚀 Reinicie o Backend

**IMPORTANTE:** Você precisa reiniciar o servidor backend para que as mudanças tenham efeito!

### Opção 1: No terminal onde o backend está rodando

1. Pressione `Ctrl+C` para parar o servidor
2. Execute novamente:
   ```powershell
   cd server
   npm run dev
   ```

### Opção 2: Mate o processo e reinicie

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
cd server
npm run dev
```

## ✅ Verificar se funcionou:

1. **Teste no navegador:** http://localhost:3001/health
   - Deve retornar: `{"status":"ok"}`

2. **Tente fazer login no frontend**
   - O erro de CORS deve desaparecer
   - O login deve funcionar normalmente

## 📝 O que mudou:

**Antes:**
```typescript
origin: 'http://localhost:5173'  // Só aceitava porta 5173
```

**Agora:**
```typescript
origin: ['http://localhost:3000', 'http://localhost:5173']  // Aceita ambas
```

## ⚠️ Sobre o erro "Cannot GET /api/auth/login"

Esse erro aparece quando alguém tenta acessar `/api/auth/login` via GET no navegador.

**Isso é normal!** A rota de login só aceita POST (não GET).

O frontend está fazendo POST corretamente, então não é um problema.

Para testar se a rota está funcionando, você pode usar:
- http://localhost:3001/api/auth/health (nova rota de diagnóstico)

