# 📘 GUIA DE USO: Sistema de Bio Lateral com Análise Automática

## 🎯 O que foi implementado

Um sistema completo de bio de usuário com:
- ✅ Bio automática gerada dinamicamente baseada em comportamento
- ✅ Sistema de tags dinâmicas com **30+ tags** predefinidas
- ✅ Análise automática de 15+ critérios diferentes
- ✅ Atualização automática a cada 6 horas via cron job
- ✅ Interface visual dark/cyberpunk
- ✅ Componente React reutilizável
- ✅ Detecção de: conteúdo visual, vídeos, threads, engagement, horários de posting

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

| Tag | Tipo | Requisitos | Cor | Emoji |
|-----|------|-----------|-----|-------|
| **Verificado** | system | Manual (is_verified=true) | 🔵 #0084ff | ✓ |
| **Admin** | system | Manual (papel de admin) | 🔴 #ff0000 | ⚙️ |
| **Moderador** | system | Manual (role moderador) | 🟠 #ff6b00 | 🛡️ |
| **Premium** | system | Assinatura ativa | 🟡 #ffd700 | ⭐ |
| **Observador** | achievement | 10+ likes por post | 🟣 #9b59b6 | 👁️ |
| **Criador** | achievement | 50+ posts | 🔴 #e74c3c | ✍️ |
| **Contador de Histórias** | achievement | 20+ posts + bio customizada ou posts >500 chars | 🟡 #f39c12 | 📖 |
| **Artista Visual** | achievement | 40%+ posts com imagens | 🔴 #e74c3c | 🎨 |
| **Videomaker** | achievement | 5+ posts com vídeos | 🟠 #ff6b00 | 🎥 |
| **Mestre dos Threads** | achievement | 10+ posts >1000 caracteres | 🟣 #9b59b6 | 🧵 |
| **Social** | achievement | 100+ comentários | 🔵 #3498db | 💬 |
| **Rei das Respostas** | achievement | 60%+ comentários são respostas | 🟦 #1abc9c | ↩️ |
| **Debatedor** | achievement | 50%+ comentários >200 caracteres | 🩷 #e91e63 | ⚔️ |
| **Viral** | achievement | 1 post com >1000 likes | 🔴 #ff0000 | 🔥 |
| **Trending** | achievement | Média >50 likes por post | 🟠 #ff6b00 | 📈 |
| **Deus do Engagement** | achievement | Taxa média engajamento >20% | 🔴 #e74c3c | 👑 |
| **Pioneiro** | badge | 300+ dias + 1+ post | 🟢 #2ecc71 | 🚀 |
| **Veterano** | badge | 365+ dias | ⚫ #95a5a6 | ⭐ |
| **Ativo** | badge | 10+ posts últimos 30 dias | 🟦 #1abc9c | 🔥 |
| **Beta Tester** | badge | Cadastrado antes de 2025 | 🟢 #00ff00 | 🧪 |
| **Insone** | badge | 30%+ posts entre 00h-06h | 🟣 #9b59b6 | 🌙 |
| **Madrugada** | badge | 30%+ posts entre 05h-09h | 🟢 #2ecc71 | ☀️ |
| **Coruja Noturna** | badge | 30%+ posts entre 22h-03h | 🟣 #8e44ad | 🦉 |
| **Guerreiro de Fim de Semana** | badge | 80%+ posts sáb/dom | 🟡 #f39c12 | 🎉 |
| **Popular** | achievement | 1000+ seguidores | 🩷 #e91e63 | 💫 |
| **Influenciador** | achievement | 10000+ seguidores | 🟣 #9c27b0 | 👑 |
| **Prolífico** | achievement | 100+ posts | 🟠 #ff9800 | 📝 |
| **Lenda** | achievement | 5000+ seguidores AND 1000+ posts | 🟡 #ffd700 | 🏆 |
| **Fundador** | system | IDs 1-10 | 🔴 #ff0000 | 👑 |
| **Apoiador** | achievement | Doou/apoiou o projeto | 🟠 #ff6b00 | ❤️ |

## 🧠 Critérios de Análise Automática

O sistema analisa **15+ critérios** diferentes para calcular as tags:

### Conteúdo
- 📝 Número total de posts (threshold: 50, 100 para prolífico)
- 📝 Comprimento médio dos posts (>500 chars = storyteller)
- 🖼️ Posts com imagens (>40% = visual artist)
- 🎥 Posts com vídeos (>5 = videomaker)
- 🧵 Posts muito longos (>1000 chars = thread master)

### Interação
- 💬 Comentários totais (threshold: 100, 200+)
- ↩️ Respostas a comentários (60%+ = reply king)
- 📋 Comentários profundos (>200 chars = debater)
- ❤️ Likes dados vs recebidos (ratio)

### Engagement
- 🔥 Post viral (>1000 likes)
- 📈 Trending (média >50 likes por post)
- 👑 Deus do engagement (>20% taxa média)

### Tempo de Posting
- 🌙 Insone (30% posts entre 00h-06h)
- ☀️ Madrugada (30% posts entre 05h-09h)
- 🦉 Coruja noturna (30% posts entre 22h-03h)
- 🎉 Guerreiro de fim de semana (80% posts sáb/dom)

### Tempo na Plataforma
- 📅 Dias cadastrado (pioneer >300, veteran >365)
- 📆 Posts recentes (ativo >10 nos últimos 30 dias)
- 🧪 Beta tester (cadastrados antes de 2025-01-01)

### Influência
- 👥 Seguidores (popular >1000, influencer >10k)
- 📝 Prolífico (>100 posts)
- 🏆 Lenda (>5000 seguidores AND >1000 posts)

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

### Cron Job (Atualização a Cada 6 Horas)

Executa a cada **6 horas** (0h, 6h, 12h, 18h UTC) para atualizar os top 1000 usuários ativos

```typescript
// server/src/jobs/updateUserTags.ts
cron.schedule('0 */6 * * *', async () => {
  // Busca top 1000 usuários ativos (últimos 30 dias)
  // Calcula novas tags para cada um
  // Atualiza banco de dados em batch
});
```

**Processo:**
1. Busca os 1000 usuários mais ativos (postaram nos últimos 30 dias)
2. Para cada usuário:
   - Recalcula as tags baseado em comportamento atual
   - Analisa: posts, imagens, vídeos, comentários, engagement, horários de posting
   - Remove tags automáticas antigas
   - Adiciona novas tags conquistadas
3. Executa em batches de 10 usuários por performance

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
