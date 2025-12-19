# 🐳 Como Iniciar o Docker Desktop

O erro que você está vendo indica que o **Docker Desktop não está rodando**.

## 🔧 Solução Rápida

### 1. Inicie o Docker Desktop

1. **Abra o Docker Desktop** no Windows:
   - Procure por "Docker Desktop" no menu Iniciar
   - Ou clique no ícone do Docker na área de notificações

2. **Aguarde o Docker inicializar**:
   - O ícone do Docker na bandeja do sistema deve ficar verde
   - Você pode ver o status na barra de tarefas

### 2. Verifique se o Docker está rodando

Abra o PowerShell e execute:

```powershell
docker ps
```

Se funcionar (mesmo que não mostre containers), o Docker está rodando.

### 3. Agora inicie o PostgreSQL

```powershell
docker-compose up -d
```

Você deve ver:
```
Creating chrono_postgres ... done
```

### 4. Verifique se o PostgreSQL está rodando

```powershell
docker ps
```

Deve mostrar o container `chrono_postgres` rodando.

## ✅ Próximos Passos

Depois que o PostgreSQL estiver rodando:

1. **Execute as migrations**:
   ```powershell
   cd server
   npm run db:migrate
   ```

2. **Inicie o servidor backend**:
   ```powershell
   cd server
   npm run dev
   ```

## ⚠️ Problemas Comuns

### Docker Desktop não inicia
- Verifique se você tem o Docker Desktop instalado
- Reinicie o computador
- Verifique se a virtualização está habilitada no BIOS

### "Unable to get image"
- Certifique-se de que o Docker Desktop está completamente iniciado
- Aguarde alguns segundos e tente novamente

### Porta 5432 já em uso
- Altere a porta no `docker-compose.yml`:
  ```yaml
  ports:
    - "5433:5432"  # Mude 5432 para 5433
  ```
- E atualize o `.env` do servidor para usar a nova porta

