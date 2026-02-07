# 🧹 Remover Posts em Branco

Para remover os posts em branco do @Sus_bacon, execute:

## Opção 1: Via Node.js (com DATABASE_URL do Railway)

```bash
# Copy o DATABASE_URL do Railroad
DATABASE_URL='postgresql://user:pass@host:5432/db' node cleanup_blank.js
```

## Opção 2: Via curl (usando o endpoint `/api/posts/admin/cleanup-blank/:username`)

Primeiro, você precisa de um token válido. Obtenha fazendo login:

```bash
# 1. Faça login para obter token
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"seuusername","password":"seupassword"}'

# Copie o token da resposta

# 2. Execute o cleanup
curl -X POST "http://localhost:3001/api/posts/admin/cleanup-blank/Sus_bacon" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Opção 3: SQL Direto (via pgAdmin ou similar)

```sql
SELECT id FROM posts 
WHERE "authorId" = (SELECT id FROM users WHERE username = 'Sus_bacon')
AND (content IS NULL OR TRIM(content) = '');

-- Verificar encontrados posts, depois deletar:
DELETE FROM posts 
WHERE "authorId" = (SELECT id FROM users WHERE username = 'Sus_bacon')
AND (content IS NULL OR TRIM(content) = '');
```

---

**Status dos Cordões**: ✅ Agora aparecem em **vermelho** com **contador de menções** na barra de pesquisa!
