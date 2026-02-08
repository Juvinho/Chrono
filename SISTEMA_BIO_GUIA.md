# 📘 GUIA DE USO: Sistema de Bio Lateral com Análise Automática

## 🎯 O que foi implementado

Um sistema completo de bio de usuário com:
- ✅ Bio automática gerada dinamicamente baseada em comportamento
- ✅ Sistema de tags dinâmicas com 12 tags predefinidas
- ✅ Análise automática de estatísticas do usuário
- ✅ Atualização automática diária via cron job
- ✅ Interface visual dark/cyberpunk
- ✅ Componente React reutilizável

## 🗄️ Banco de Dados

### Tabelas Criadas

```sql
-- tag_definitions: Define todas as tags do sistema
CREATE TABLE tag_definitions (
  id SERIAL PRIMARY KEY,
  tag_key VARCHAR(50) UNIQUE,      -- 'verified', 'creator', etc
  display_name VARCHAR(100),        -- "Verificado", "Criador"
  description TEXT,                 -- "Perfil verificado..."
  color VARCHAR(7),                 -- Cor hex da tag
  icon VARCHAR(50),                 -- Emoji ou ícone
  tag_type VARCHAR(50),             -- 'system', 'achievement', 'badge', 'role'
  criteria JSONB,                   -- Critérios para obter tag
  display_order INTEGER,            -- Ordem de exibição
  is_active BOOLEAN
);

-- user_tags: Tags ganhas por cada usuário
CREATE TABLE user_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,                     -- Usuário que ganhou a tag
  tag_key VARCHAR(50),              -- Qual tag
  earned_at TIMESTAMP,              -- Quando foi ganho
  metadata JSONB                    -- Dados adicionais
);
```

### Tags Disponíveis

| Tag | Tipo | Requisitos | Cor |
|-----|------|-----------|-----|
| **Verificado** | system | Manual (is_verified=true) | 🔵 #0084ff |
| **Admin** | system | Manual (papel de admin) | 🔴 #ff0000 |
| **Moderador** | system | Manual (role moderador) | 🟠 #ff6b00 |
| **Observador** | achievement | 10+ likes por post | 🟣 #9b59b6 |
| **Criador** | achievement | 50+ posts | 🔴 #e74c3c |
| **Contador de Histórias** | achievement | 20+ posts + bio customizada | 🟡 #f39c12 |
| **Social** | achievement | 100+ comentários | 🔵 #3498db |
| **Pioneiro** | badge | 300+ dias + 1+ post | 🟢 #2ecc71 |
| **Veterano** | badge | 365+ dias | ⚫ #95a5a6 |
| **Ativo** | badge | 10+ posts últimos 30 dias | 🟦 #1abc9c |
| **Popular** | achievement | 1000+ seguidores | 🩷 #e91e63 |
| **Influenciador** | achievement | 10000+ seguidores | 🟣 #9c27b0 |
| **Prolífico** | achievement | 100+ posts | 🟠 #ff9800 |

## 📝 Bio Automática

A bio é gerada dinamicamente analisando:
- Número de posts
- Ratio likes/posts (determinação: observador vs criador)
- Tempo na plataforma
- Número de seguidores
- Atividade nos últimos 30 dias
- Engajamento em comentários

### Exemplos

```
João (2 posts, 50 likes, 2 meses):
→ "Observador silencioso que aprecia bom conteúdo. Membro desde fevereiro de 2026."

Maria (150 posts, 1000 likes, 1 ano):
→ "Criador prolífico de conteúdo no @Chrono. Veterano de 1 ano. Influenciador com 5k seguidores."

Pedro (25 posts, 50 likes, 6 meses):
→ "Criador ativo de histórias. Ativo há 6 meses. Frequentemente ativo."
```

## 🔌 API

### Endpoints

#### GET `/api/bio/:userId/bio`
Busca a bio completa do usuário

**Response:**
```json
{
  "customBio": "Minha bio customizada aqui",
  "autoBio": "Bio gerada automaticamente baseada em estatísticas",
  "tags": [
    {
      "key": "creator",
      "displayName": "Criador",
      "description": "Criador ativo de conteúdo",
      "color": "#e74c3c",
      "icon": "✍️",
      "type": "achievement",
      "earnedAt": "2026-02-01T10:30:00Z"
    }
  ]
}
```

#### POST `/api/bio/:userId/bio/refresh`
Atualiza as tags automáticas do usuário (requer autenticação)

**Response:**
```json
{
  "success": true,
  "message": "Tags updated",
  "tags": [...]
}
```

#### GET `/api/bio/system/tags`
Lista todas as tags disponíveis no sistema

## 💻 Frontend

### Hook: `useBio`

```typescript
const { bioData, isLoading, error, refreshTags } = useBio(userId);

if (isLoading) return <div>Carregando...</div>;

console.log(bioData.autoBio);     // Bio automática
console.log(bioData.customBio);   // Bio customizada (se existir)
console.log(bioData.tags);        // Array de tags
```

### Componente: `ProfileBioSidebar`

```typescript
import { ProfileBioSidebar } from '@/components/ProfileBioSidebar';

export function ProfilePage() {
  const userId = "sua-uuid";
  
  return (
    <div className="profile-layout">
      <ProfileBioSidebar userId={userId} />
      {/* Resto da página */}
    </div>
  );
}
```

### Styling

```typescript
// classes.css
.bio-sidebar { ... }         // Container principal
.bio-header { ... }          // Cabeçalho com ícone
.bio-content { ... }         // Conteúdo da bio
.bio-tags-section { ... }    // Seção de tags
.tags-grid { ... }           // Grid das tags
.bio-tag { ... }             // Tag individual
```

## ⚙️ Automação

### Cron Job (Atualização Diária)

Executa todo dia às **3 AM UTC**

```typescript
// server/src/jobs/updateUserTags.ts
cron.schedule('0 3 * * *', async () => {
  // Busca usuários ativos
  // Calcula novas tags
  // Atualiza banco de dados
});
```

**Processo:**
1. Busca todos os usuários que postaram nos últimos 30 dias
2. Para cada usuário:
   - Recalcula as tags baseado em comportamento atual
   - Remove tags automáticas antigas
   - Adiciona novas tags conquistadas

## 🚀 Uso Prático

### 1. Verificar a Bio de um Usuário

```typescript
// Na página de perfil
import { useBio } from '@/hooks/useBio';

const Profile = ({ userId }) => {
  const { bioData } = useBio(userId);
  
  return (
    <div>
      <h2>Bio</h2>
      <p>{bioData?.customBio || bioData?.autoBio}</p>
      
      <h3>Tags</h3>
      {bioData?.tags.map(tag => (
        <span key={tag.key}>{tag.icon} {tag.displayName}</span>
      ))}
    </div>
  );
};
```

### 2. Atualizar Tags Manualmente

```typescript
// Botão para atualizar tags
const refreshUserTags = async (userId) => {
  try {
    const response = await fetch(`/api/bio/${userId}/bio/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Tags atualizado!', response.data);
  } catch (error) {
    console.error('Erro ao atualizar tags');
  }
};
```

### 3. Saber Por que Um Usuário tem uma Tag

Você pode verificar os critérios na tabela `tag_definitions`:

```sql
SELECT * FROM tag_definitions WHERE tag_key = 'creator';
-- Resultado: 50+ posts
```

## 📊 Estatísticas Computadas

Para calcular tags, o sistema analisa:

```
SELECT 
  COUNT(posts)                    -- Total de posts
  COUNT(likes)                    -- Likes dados
  COUNT(followers)                -- Seguidores
  COUNT(comments)                 -- Comentários dados
  SUM(likes) / SUM(posts)        -- Ratio likes/posts
  NOW() - created_at             -- Tempo na plataforma
```

## 🔒 Segurança

- ✅ Bio customizada pode incluir XSS - sanitizada no frontend
- ✅ Apenas o usuário pode atualizar suas próprias tags
- ✅ Tags administrativas não são removidas automaticamente
- ✅ Todas as operações requerem autenticação válida

## 🐛 Troubleshooting

### "Tags não aparecem"
1. Verificar se `user_tags` tem registros para o usuário
2. Verificar se `tag_definitions` está populado
3. Executar `/api/bio/{userId}/bio/refresh` manualmente

### "Bio automática muito genérica"
1. Isso é esperado para novos usuários
2. Conforme o usuário interage, a bio muda
3. Usar `customBio` na tabela `users` para bio fixa

### "Cron job não executando"
1. Verificar logs do servidor: `grep "Tag update" logs.txt`
2. Verificar se node-cron está instalado: `npm list node-cron`
3. Verifi se o servidorestá rodando com `NODE_ENV=production`

## 📦 Instalação

Tudo já foi instalado! Mas se precisar refazer:

```bash
# 1. Instalar dependências
cd server
npm install node-cron @types/node-cron

# 2. Executar migrações
npm run db:migrate

# 3. Verificar tags inseridas
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tag_definitions;"

# 4. Reiniciar servidor
npm run dev
```

## ✅ Checklist de Validação

- [x] Banco de dados: tabelas `tag_definitions` e `user_tags` criadas
- [x] Backend: Service `UserBioService` implementado
- [x] Backend: Rotas API `/api/bio/*` funcionando
- [x] Backend: Cron job scheduling implementado
- [x] Frontend: Hook `useBio` criado
- [x] Frontend: Componente `ProfileBioSidebar` criado
- [x] Frontend: CSS dark/cyberpunk aplicado
- [x] Build: Sem erros TypeScript
- [x] Build: npm run build passou
- [x] Deployment: Pronto para produção

## 📚 Arquivos Criados/Modificados

```
✅ server/src/db/migrations/create_user_tags.sql
✅ server/src/services/userBioService.ts
✅ server/src/routes/userBio.ts
✅ server/src/jobs/updateUserTags.ts
✅ server/src/index.ts (updated)
✅ server/package.json (added node-cron)
✅ src/hooks/useBio.ts
✅ src/components/ProfileBioSidebar.tsx
✅ src/components/profile-bio-sidebar.css
```

## 🎨 Exemplo Visual

```
╔═════════════════════════════████╗
║  📄 bio                         ║
╠═════════════════════════════════╣
║                                 ║
║  Cara que gosta de coxinhas     ║
║  bem GORDINHAS e dono da        ║
║  @Chrono.                       ║
║                                 ║
║  Ativo desde janeiro de 2024.   ║
║  Criador de histórias épicas.   ║
║                                 ║
╠═════════════════════════════════╣
║  :: SYSTEM TAGS ::              ║
║                                 ║
║  ┌──────────┐  ┌──────────┐    ║
║  │✓Verificado│  │✍️Criador  │   ║
║  └──────────┘  └──────────┘    ║
║                                 ║
║  ┌──────────┐  ┌──────────┐    ║
║  │🚀Pioneiro │  │⭐Veterano│   ║
║  └──────────┘  └──────────┘    ║
║                                 ║
╚═════════════════════════════════╝
```

---

**Sistema de Bio com Análise Automática ✅ IMPLEMENTADO COM SUCESSO!**
