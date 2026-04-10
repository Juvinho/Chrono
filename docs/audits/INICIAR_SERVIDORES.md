# 🚀 Como Iniciar Backend e Frontend Juntos

Existem várias formas de iniciar o backend e frontend simultaneamente. Escolha a que preferir:

---

## 🎯 Método 1: Script Automático (Mais Fácil)

### Windows PowerShell

Na pasta raiz do projeto, execute:

```powershell
.\start-dev.ps1
```

Isso irá:
- ✅ Instalar dependências se necessário
- ✅ Iniciar o backend em uma janela separada
- ✅ Iniciar o frontend na janela atual

### Windows CMD

Na pasta raiz do projeto, execute:

```cmd
start-dev.bat
```

---

## 🎯 Método 2: Usando concurrently (Recomendado)

### Passo 1: Instalar concurrently

Na pasta raiz, execute:

```bash
npm install
```

Isso instalará o `concurrently` automaticamente.

### Passo 2: Iniciar ambos

```bash
npm run dev:all
```

Isso iniciará backend e frontend na mesma janela, com logs coloridos.

---

## 🎯 Método 3: Manual (2 Terminais)

### Terminal 1 - Backend

```bash
cd server
npm run dev
```

### Terminal 2 - Frontend

```bash
npm run dev
```

---

## 📋 Scripts Disponíveis

Na pasta raiz do projeto, você tem:

- `npm run dev` - Inicia apenas o frontend
- `npm run dev:server` - Inicia apenas o backend
- `npm run dev:all` - Inicia backend e frontend juntos (usa concurrently)
- `npm run install:all` - Instala dependências de frontend e backend

---

## ⚠️ Importante

1. **Certifique-se de que o banco de dados está rodando:**
   ```bash
   docker-compose up -d
   ```

2. **Certifique-se de que as migrations foram executadas:**
   ```bash
   cd server
   npm run db:migrate
   ```

3. **Configure o arquivo `.env` do backend** antes de iniciar

---

## 🎉 Depois de Iniciar

- ✅ Backend estará em: **http://localhost:3001**
- ✅ Frontend estará em: **http://localhost:5173**
- ✅ Acesse o site em: **http://localhost:5173**

---

## 🛑 Para Parar

- **Método 1 e 2:** Pressione `Ctrl+C` na janela/terminal
- **Método 3:** Pressione `Ctrl+C` em ambos os terminais


