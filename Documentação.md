# ⏳ CHRONO — Dossiê Completo

<div align="center">

**Rede Social Temporal Cyberpunk**

*"Onde o tempo não é linear, e as conexões são eternas."*

**Versão:** 0.0.0 (Beta)  
**Criador:** [Juvinho](https://github.com/Juvinho)  
**Licença:** Open Source  
**Última Atualização do Dossiê:** 24 de Fevereiro de 2026

</div>

---

## 📖 ÍNDICE

1. [Visão Geral](#1--visão-geral)
2. [Linha do Tempo do Projeto](#2--linha-do-tempo-do-projeto)
3. [Arquitetura Técnica](#3--arquitetura-técnica)
4. [Banco de Dados — Schema Completo](#4--banco-de-dados--schema-completo)
5. [Sistema de Autenticação](#5--sistema-de-autenticação)
6. [Timeline & Posts](#6--timeline--posts)
7. [Sistema de Reações Cyberpunk](#7--sistema-de-reações-cyberpunk)
8. [Echo System (Reposts)](#8--echo-system-reposts)
9. [Sistema de Mensagens (DMs)](#9--sistema-de-mensagens-dms)
10. [Sistema de Notificações](#10--sistema-de-notificações)
11. [Sistema de Tags ($Cordões)](#11--sistema-de-tags-cordões)
12. [Sistema de Bio Automática](#12--sistema-de-bio-automática)
13. [Sistema de Badges (21 Tags Comportamentais)](#13--sistema-de-badges-21-tags-comportamentais)
14. [Threads (Cordões de Discussão)](#14--threads-cordões-de-discussão)
15. [Sistema de Enquetes (Polls)](#15--sistema-de-enquetes-polls)
16. [Cápsulas do Tempo](#16--cápsulas-do-tempo)
17. [CyberCompanion (Glitchi)](#17--cybercompanion-glitchi)
18. [Marketplace de Cosméticos](#18--marketplace-de-cosméticos)
19. [Painel Administrativo](#19--painel-administrativo)
20. [Sistema de Segurança](#20--sistema-de-segurança)
21. [Trending & Analytics (Data Slicer)](#21--trending--analytics-data-slicer)
22. [Sistema de E-mail](#22--sistema-de-e-mail)
23. [Internacionalização (i18n)](#23--internacionalização-i18n)
24. [API Completa — Todos os Endpoints](#24--api-completa--todos-os-endpoints)
25. [Frontend — Arquitetura Detalhada](#25--frontend--arquitetura-detalhada)
26. [Backend — Serviços e Middleware](#26--backend--serviços-e-middleware)
27. [Deploy & Infraestrutura](#27--deploy--infraestrutura)
28. [Auditoria de Segurança](#28--auditoria-de-segurança)
29. [Problemas Conhecidos & Roadmap](#29--problemas-conhecidos--roadmap)
30. [Notas do Desenvolvedor](#30--notas-do-desenvolvedor)

---

## 1. ⏳ Visão Geral

**Chrono** não é apenas mais uma rede social — é uma experiência **Cyberpunk** imersiva que reimagina como interagimos com o tempo e com os outros.

### O que torna o Chrono único:

- **Timeline Horizontal**: Em vez do feed vertical infinito, os usuários arrastam uma timeline horizontal para explorar momentos no tempo, com "hoje" como ponto de partida
- **Estética Cyberpunk/Digital Brutalism**: Interface futurista com efeitos visuais (scanlines, glitch overlays), temas escuros e cores neon
- **Reações Temáticas**: Esqueça o "Like" — aqui usamos **Glitch**, **Upload**, **Corrupt**, **Rewind** e **Static**
- **$Cordões**: Em vez de hashtags (#), usamos `$tags` (Cordões) como fio condutor de conversas
- **Echos**: Em vez de "Retweet", temos Echos — reverberações temporais do conteúdo
- **Cápsulas do Tempo**: Posts que só desbloqueiam em uma data futura
- **CyberCompanion**: Companheiro digital com IA (robô, holograma ou drone)
- **Humores Neurais**: Posts com mood (neon-joy, void-despair, rage-glitch, zen-stream)

### Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| **Backend** | Node.js 20, Express 4, TypeScript (ES Modules) |
| **Banco de Dados** | PostgreSQL 15 (via `pg` pool) |
| **Real-time** | Socket.io (WebSocket + fallback polling) |
| **Autenticação** | JWT + Bcrypt |
| **E-mail** | Nodemailer (Gmail SMTP) |
| **IA** | Google Gemini API |
| **Deploy** | Docker, Railway, Render |
| **Testes** | Vitest, Testing Library, JSDOM |
| **State** | Zustand (global), React Context (feature-specific) |

---

## 2. 📅 Linha do Tempo do Projeto

### Fase 1 — Fundação (Janeiro–Fevereiro 2026)
- Criação da estrutura base com React + Vite + TypeScript
- Implementação do backend Express com PostgreSQL
- Sistema de autenticação (registro, login, JWT)
- Primeiros posts e timeline vertical

### Fase 2 — A Grande Visão (Fevereiro 2026)
> *"Só hoje já foram feitos 32 commits, e mais de 2 litros de café foram consumidos."*

- Migração para timeline horizontal (EchoFrame) — conceito revolucionário
- Implementação do sistema de 5 reações cyberpunk
- Sistema de seguir/deixar de seguir
- Menções (`@username`) e Tags (`$cordões`)
- Busca de usuários (ILIKE com índices trigram)
- Feed personalizado ("Following" filter)

### Fase 3 — Rede Social Completa (6 de Fevereiro 2026)
**8 commits, 15+ arquivos modificados, Deploy no Railway**
- Sistema de menções com notificações automáticas
- Endpoint de contagem de posts (`/posts/count`)
- Timestamps relativos ("agora", "Xm", "HH:MM", "ontem", "Xd")
- Error handling para replies com toasts
- Campo `display_name` implementado (12 arquivos, 13 queries)
- ThreadView para replies aninhadas
- Reposts (Echo system)
- Enquetes (Polls)
- Temas e personalização de perfil

### Fase 4 — Chat Messenger (Fevereiro 2026)
**Demolição total do chat antigo + reconstrução do zero**
- Remoção completa do sistema de chat problemático
- Novo sistema estilo **Facebook Messenger**:
  - Sidebar de conversas com preview
  - Chat em tempo real via WebSocket
  - Read receipts (visto/não visto)
  - Indicador "digitando..."
  - Floating chat boxes (múltiplas janelas)
  - Split view (feed + chat lado a lado)
- Rate limiting específico para chat

### Fase 5 — Segurança & Auditoria (7 de Fevereiro 2026)
**29 problemas identificados, 6 críticos corrigidos**
- Build: 121 módulos, 563.21 KB (149.21 KB gzip)
- Correção de XSS injection em posts
- Migração JWT de localStorage → sessionStorage
- Correção de memory leaks em Socket.io
- Implementação de AbortController contra race conditions
- Type safety em autenticação (eliminação de `any`)
- ErrorBoundary global

### Fase 6 — Tags & Bio Inteligente (Fevereiro 2026)
- Sistema de 21 tags comportamentais (4 categorias)
- Bio auto-gerada por análise de 15+ critérios
- 30+ auto-tags (achievement, badge, influence)
- Cron jobs: tags a cada 6h, bio diária às 3h
- Acessibilidade WCAG AA para tags

### Fase 7 — Marketplace & Companion (Fevereiro 2026)
- Loja de cosméticos (frames, efeitos, badges, temas)
- Sistema de raridade (common → legendary)
- CyberCompanion com XP, level e mood
- Subscriptions (free/pro/pro_plus)
- Verificação de e-mail com DNS MX + SMTP handshake

### Fase 8 — i18n & Polimento (Fevereiro 2026)
- 589 chaves de tradução (PT + EN), 100% cobertura
- Admin dashboard completo
- Moderação de conteúdo
- Páginas de erro cyberpunk temáticas
- Sistema de sons (post, reply, notification, glitch)

### Marcos Estatísticos
- **40+ commits** totais
- **17 serviços** backend
- **121+ módulos** frontend
- **589 chaves** de tradução
- **21 tags** comportamentais
- **30+ auto-tags** de bio
- **5 reações** cyberpunk
- **6 vulnerabilidades** críticas corrigidas

---

## 3. 🏗️ Arquitetura Técnica

### Visão de Alto Nível

```
┌──────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                  │
│  React 19 + TypeScript + Vite                        │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ Timeline  │ │ Messages │ │ Profile/Settings   │   │
│  │ EchoFrame │ │ Chat     │ │ Marketplace        │   │
│  └──────────┘ └──────────┘ └────────────────────┘   │
│         │            │              │                 │
│    REST API     Socket.io      REST API              │
└────────┬─────────────┬──────────────┬────────────────┘
         │             │              │
┌────────┴─────────────┴──────────────┴────────────────┐
│                 SERVIDOR (Node.js/Express)            │
│  Port: 3001 | JWT Auth | Rate Limiting               │
│  ┌───────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │ Routes    │ │ Services │ │ Middleware         │   │
│  │ (14 files)│ │(17 files)│ │ (auth, rate,       │   │
│  │           │ │          │ │  admin, error)     │   │
│  └───────────┘ └──────────┘ └───────────────────┘   │
│         │            │              │                 │
│    ┌────┴────────────┴──────────────┘                │
│    │    PostgreSQL Pool (max: 20)                     │
└────┼─────────────────────────────────────────────────┘
     │
┌────┴─────────────────────────────────────────────────┐
│               PostgreSQL 15                           │
│  UUID PKs | pg_trgm (fuzzy search) | uuid-ossp       │
│  20+ tabelas | Triggers | Functions                  │
└──────────────────────────────────────────────────────┘
```

### Estrutura de Diretórios

```
Chrono/
├── src/                          # Frontend React
│   ├── App.tsx                   # App principal com rotas
│   ├── index.tsx                 # Entry point
│   ├── api/                     # Clients HTTP (baseClient, auth)
│   ├── components/              # Componentes compartilhados
│   │   ├── ui/                  # Componentes base de UI
│   │   ├── ErrorBoundary.tsx    # Error boundary global
│   │   ├── FloatingChat*.tsx    # Chat flutuante
│   │   └── ProfileBioSidebar.tsx
│   ├── contexts/                # 8 React Contexts
│   ├── features/                # Módulos por feature
│   │   ├── analysis/            # Dashboard de trending
│   │   ├── auth/                # Login, registro, recovery
│   │   ├── chat/                # WebSocket chat (legacy)
│   │   ├── companion/           # CyberCompanion/Glitchi
│   │   ├── marketplace/         # Loja de cosméticos
│   │   ├── messaging/           # Sistema de DMs
│   │   ├── profile/             # Perfil + settings
│   │   ├── stories/             # (Removido/deprecated)
│   │   └── timeline/            # Dashboard, posts, threads
│   ├── hooks/                   # Custom hooks globais
│   ├── layouts/                 # Layouts (Split, etc.)
│   ├── pages/                   # Páginas Admin
│   ├── routes/                  # Configuração de rotas
│   ├── services/                # Serviços frontend
│   ├── styles/                  # CSS global
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utilitários (locales, etc.)
├── server/                       # Backend Express
│   └── src/
│       ├── index.ts             # Entry point do servidor
│       ├── config/              # Configurações
│       ├── controllers/         # Controllers
│       ├── db/                  # Database (schema, migrations, seeds)
│       │   ├── schema.sql       # Schema completo
│       │   ├── migrations/      # Migrações SQL
│       │   ├── connection.ts    # Pool PostgreSQL
│       │   └── seed.ts          # Seeds iniciais
│       ├── jobs/                # Cron jobs (tags, bio)
│       ├── middleware/          # Auth, admin, rate limit, errors
│       ├── routes/              # 14 arquivos de rotas
│       ├── scripts/             # Scripts utilitários
│       ├── services/            # 17 serviços de negócio
│       ├── types/               # Tipos backend
│       └── utils/               # Utilitários (validação, etc.)
├── public/                       # Assets estáticos
├── docker-compose.yml            # PostgreSQL container
├── Dockerfile                    # Build de produção
├── railway.json                  # Config Railway
├── nixpacks.toml                 # Config Nixpacks
├── vite.config.ts                # Config Vite
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependências raiz
```

---

## 4. 🗃️ Banco de Dados — Schema Completo

PostgreSQL 15 com extensões `uuid-ossp` (UUIDs) e `pg_trgm` (busca fuzzy).

### 4.1 Tabela `users` (Tabela Principal)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | Identificador único |
| `username` | VARCHAR(50) UNIQUE | Nome de usuário |
| `display_name` | VARCHAR(100) | Nome de exibição |
| `email` | VARCHAR(255) UNIQUE | E-mail |
| `password_hash` | VARCHAR(255) | Hash bcrypt da senha |
| `google_id` | VARCHAR(255) | ID Google (OAuth futuro) |
| `avatar` | TEXT | URL do avatar |
| `bio` | TEXT | Biografia personalizada |
| `birthday` | DATE | Data de nascimento |
| `pronouns` | VARCHAR(50) | Pronomes |
| `location` | VARCHAR(100) | Localização |
| `website` | VARCHAR(255) | Website |
| `cover_image` | TEXT | Imagem de capa |
| `public_key` | TEXT | Chave pública (E2E encryption) |
| `followers_count` | INT DEFAULT 0 | Contagem de seguidores |
| `following_count` | INT DEFAULT 0 | Contagem de seguindo |
| `is_private` | BOOLEAN DEFAULT false | Perfil privado |
| `is_verified` | BOOLEAN DEFAULT false | Perfil verificado |
| `is_banned` | BOOLEAN DEFAULT false | Usuário banido |
| `email_verification_token` | VARCHAR(255) | Token de verificação |
| `verification_badge_label` | VARCHAR(50) | Label do badge de verificação |
| `verification_badge_color` | VARCHAR(7) | Cor do badge (#hex) |
| `profile_settings` | JSONB | Configurações do perfil |
| `profile_type` | VARCHAR(20) | personal / professional |
| `headline` | VARCHAR(200) | Título profissional |
| `skills` | TEXT[] | Array de habilidades |
| `work_experience` | JSONB | Experiência de trabalho |
| `education` | JSONB | Educação |
| `subscription_tier` | VARCHAR(20) DEFAULT 'free' | free / pro / pro_plus |
| `subscription_expires_at` | TIMESTAMP | Expiração da assinatura |
| `blocked_users` | TEXT[] | Array de IDs bloqueados |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Índices**: Trigram index em `username` para busca fuzzy.

### 4.2 Tabela `posts`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | Identificador único |
| `author_id` | UUID FK→users | Autor do post |
| `content` | TEXT | Conteúdo textual |
| `image_url` | TEXT | URL da imagem |
| `video_url` | TEXT | URL do vídeo |
| `is_thread` | BOOLEAN | É parte de thread? |
| `is_private` | BOOLEAN | Post privado? |
| `mood` | VARCHAR | neon-joy / void-despair / rage-glitch / zen-stream / neutral |
| `in_reply_to_id` | UUID FK→posts | Resposta a qual post |
| `repost_of_id` | UUID FK→posts | Repost de qual post |
| `thread_id` | UUID FK→threads | Thread associada |
| `poll_options` | JSONB | Opções de enquete |
| `poll_ends_at` | TIMESTAMP | Fim da enquete |
| `unlock_at` | TIMESTAMP | Cápsula do Tempo — desbloqueia nesta data |
| `created_at` | TIMESTAMP | Criação |
| `updated_at` | TIMESTAMP | Atualização |

### 4.3 Tabela `reactions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | — |
| `post_id` | UUID FK→posts | Post reagido |
| `user_id` | UUID FK→users | Quem reagiu |
| `reaction_type` | VARCHAR | Glitch / Upload / Corrupt / Rewind / Static |

**Constraint**: UNIQUE(post_id, user_id) — uma reação por usuário por post.

### 4.4 Tabela `follows`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | — |
| `follower_id` | UUID FK→users | Quem segue |
| `following_id` | UUID FK→users | Quem é seguido |

**Constraints**: UNIQUE(follower, following), CHECK(follower ≠ following).

### 4.5 Tabelas de Mensagens

**`conversations`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | — |
| `user1_id` | UUID FK→users | Usuário 1 (menor ID) |
| `user2_id` | UUID FK→users | Usuário 2 (maior ID) |
| `last_message_at` | TIMESTAMP | Última mensagem |

**Constraint**: UNIQUE(user1_id, user2_id), CHECK(user1_id < user2_id).

**`messages`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | — |
| `conversation_id` | UUID FK→conversations | Conversa |
| `sender_id` | UUID FK→users | Remetente |
| `content` | TEXT (1–1000 chars) | Conteúdo |
| `image_url` | TEXT | Imagem anexada |
| `is_read` | BOOLEAN | Lida? |
| `created_at` / `sent_at` | TIMESTAMP | Timestamps |

**`message_status`** — Rastreamento de status por usuário (delivered / read).

**`encrypted_cords`** — Grupos privados com auto-destruição (schema definido).

### 4.6 Tabelas de Threads

**`threads`** — Espaços de discussão com título, descrição, status (active/archived), `unlock_at`.

**`thread_audit`** — Log de auditoria com trigger automático para mudanças de status.

**Triggers**:
- `enforce_reply_same_thread` — Replies herdam `thread_id` do post pai
- `thread_audit_trg` — Log automático de mudanças de status

**Função**: `archive_threads(cutoff_days)` — Auto-arquiva threads inativas.

### 4.7 Tabelas do Marketplace

**`items`** — Itens cosméticos (frame/effect/badge/theme) com rarity (common→legendary).

**`user_items`** — Inventário do usuário com `is_equipped`.

### 4.8 Tabelas de Tags

**`tag_definitions`** — 21 definições de tags com nome, ícone, cor, categoria, condições de aquisição/remoção.

**`user_tags`** — Relação user↔tag com histórico (adquirida_em, removida_em, motivo).

### 4.9 Outras Tabelas

| Tabela | Descrição |
|--------|-----------|
| `notifications` | Tipos: reply, reaction, follow, mention, repost, directMessage |
| `poll_votes` | Votos em enquetes (UNIQUE por user/post) |
| `images` | Metadados de imagens (url, format, size, dimensions) |
| `videos` | Metadados de vídeos (url, thumbnail, duration, codec) |
| `post_media` | Join table posts↔media |
| `push_subscriptions` | Web push (endpoint, p256dh, auth) |
| `user_profiles` | Dados normalizados de perfil |
| `user_settings` | Configurações (tema, cor, efeito, animações) |

---

## 5. 🔐 Sistema de Autenticação

### Fluxo de Registro
1. Validação de username (disponibilidade, formato, sem emojis)
2. Validação de e-mail (formato, disponibilidade)
3. **Verificação DNS**: Lookup de registros MX do domínio
4. **Verificação SMTP**: Handshake RCPT TO para validar se o e-mail existe
5. Hash da senha com bcrypt (10 rounds)
6. Criação do usuário com avatar e banner padrão
7. Envio de e-mail de verificação (link tokenizado)
8. Retorno do JWT token

### Fluxo de Login
1. Busca por username
2. Comparação de hash bcrypt
3. Geração de JWT com `userId` e `username`
4. Suporte a 2FA (preparado na API)

### Segurança de Tokens
- **JWT** armazenado em `sessionStorage` (limpo ao fechar aba)
- Validação com regex antes do armazenamento: `/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/`
- Segredo JWT **obrigatório** (servidor não inicia sem `JWT_SECRET`)
- Admin usa segredo separado (`ADMIN_JWT_SECRET`)

### Verificação de E-mail
- Token SHA-256 com expiração de 24h
- Rate limit: 3 e-mails/hora por IP
- Máximo 3 tentativas totais
- Templates HTML com estilo cyberpunk
- Link direto `/verify-email/:token`

### Recuperação de Senha
- Token de reset via e-mail
- Endpoint separado para reset com token
- Endpoint autenticado para `change-password`

### Exclusão de Conta
- `DELETE /api/auth/delete-account` remove todos os dados do usuário

---

## 6. 🕰️ Timeline & Posts

### A Timeline Horizontal (EchoFrame)
O conceito central do Chrono: em vez de scroll vertical infinito, o usuário arrasta uma **timeline horizontal** para navegar no tempo.

- **Ponto de partida**: "Hoje"
- **Navegação**: Arrastar esquerda/direita para percorrer datas
- **Filtros**: All, Following, Trending, Media, Polls
- **URL**: `/echoframe/:dateSegment`

### Criação de Posts
O **PostComposer** suporta:
- Texto com menções (`@user`) e tags (`$cord`)
- URLs de imagem e vídeo
- **Enquetes** (múltiplas opções + timer)
- **Mood Neural**: neon-joy 😊, void-despair 😞, rage-glitch 😤, zen-stream 🧘, neutral
- **Cápsula do Tempo**: Data de desbloqueio (`unlock_at`)
- **Voz para texto**: Integração Web Speech API
- **Moderação**: Conteúdo verificado automaticamente antes de publicar

### Funcionalidades de Posts
| Feature | Descrição |
|---------|-----------|
| **Criar** | Texto, imagem, vídeo, enquete, mood, cápsula |
| **Editar** | Apenas pelo autor |
| **Deletar** | Apenas pelo autor |
| **Reply** | Resposta encadeada (herda thread_id) |
| **Echo** | Repost (não pode echo de echo) |
| **Reações** | 5 tipos cyberpunk (1 por usuário) |
| **Privacidade** | Posts privados (visíveis só para seguidores + autor) |
| **Menções** | `@username` → link clicável + notificação |
| **Tags** | `$cord` → link para `/cordao/:tag` |
| **Enquetes** | Opções JSONB, 1 voto/usuário, timer opcional |
| **Bookmark** | Salvar posts para depois |
| **Report** | Denunciar conteúdo |

### Renderização de Conteúdo
- Tags `$cord` e menções `@user` parseados com segurança (regex: `/^\$[\w]{1,30}$/`)
- Posts novos aparecem com **animação de glitch** (3 segundos)
- Skeleton loading durante carregamento
- Timestamps relativos: "agora" → "Xm" → "HH:MM" → "ontem" → "Xd" → "DD mês"

---

## 7. ⚡ Sistema de Reações Cyberpunk

Em vez do tradicional "Like", o Chrono usa 5 reações temáticas:

| Reação | Significado | Equivalente |
|--------|-------------|-------------|
| ⚡ **Glitch** | Reação principal | Like |
| ⬆️ **Upload** | Aprovação/boost | Love |
| 🔴 **Corrupt** | Corrupção/dislike | Dislike |
| ⏪ **Rewind** | Nostalgia/throwback | Haha |
| 📺 **Static** | Ruído/confusão | Wow |

### Comportamento
- **Uma reação por usuário por post** (constraint UNIQUE)
- **Toggle**: Clicar na mesma reação remove-a
- **Troca**: Clicar em outra reação substitui a anterior
- **Privacidade**: Reações em posts privados exigem seguir o autor
- **Batch loading**: Carregamento em lote para performance do feed
- **Tooltip**: `ReactionTooltip` mostra quem reagiu com cada tipo
- **Notificação**: Autor do post recebe notificação de reação

---

## 8. 🔁 Echo System (Reposts)

**Echo** é o equivalente ao "Retweet" no universo Chrono — uma reverberação temporal do conteúdo original.

### Funcionamento
1. Usuário clica em "Echo" em um post
2. Sistema cria novo post com `repost_of_id` apontando para o original
3. Post original é exibido embutido no Echo card
4. Som de echo toca no sucesso

### Regras
- **Não é possível fazer Echo de um Echo** (previne chains)
- O Echo aparece no feed do autor do Echo
- Autor original recebe notificação de tipo `repost`
- API: `POST /api/posts/:id/echo`

---

## 9. 💬 Sistema de Mensagens (DMs)

Reconstruído do zero como sistema estilo **Facebook Messenger**.

### Arquitetura
```
┌──────────────────────────────────────────────┐
│               Messaging Layout               │
│  ┌──────────┐  ┌──────────────────────────┐  │
│  │Conversation│  │      Chat Area          │  │
│  │   List    │  │  ┌──────────────────┐   │  │
│  │           │  │  │  Message List    │   │  │
│  │  user1    │  │  │  (bubbles)       │   │  │
│  │  user2  ◄─┼──┤  │                  │   │  │
│  │  user3    │  │  │  msg1 ←          │   │  │
│  │           │  │  │       → msg2     │   │  │
│  │           │  │  │  msg3 ←          │   │  │
│  │           │  │  └──────────────────┘   │  │
│  │           │  │  ┌──────────────────┐   │  │
│  │           │  │  │  Message Input   │   │  │
│  │           │  │  └──────────────────┘   │  │
│  └──────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Funcionalidades

| Feature | Descrição |
|---------|-----------|
| **Conversas 1:1** | DMs entre dois usuários |
| **Find-or-Create** | `POST /api/chat/init` — encontra ou cria conversa |
| **Real-time** | WebSocket via Socket.io (JWT authenticated) |
| **Read Receipts** | Status: sent → delivered → read |
| **Indicador "Digitando..."** | TypingIndicator via WebSocket |
| **Floating Chat** | Múltiplas janelas flutuantes simultâneas |
| **Split View** | Feed + Chat lado a lado em `/messages` |
| **Auto-scroll** | Scroll automático para novas mensagens |
| **Timestamps** | Hoje 14:30, Ontem, Seg/Ter, DD/MM/AAAA |

### WebSocket Events
- `join_conversation` / `leave_conversation` — Entrar/sair de sala
- `new_message` — Nova mensagem em tempo real
- `message_read` — Marcação de leitura
- `typing` / `stop_typing` — Indicador de digitação

### Rate Limiting
- 500 POST requests/min para chat
- GET requests sem limiting

---

## 10. 🔔 Sistema de Notificações

### Tipos de Notificação
| Tipo | Trigger | Mensagem |
|------|---------|----------|
| `reply` | Resposta a post | "[user] respondeu ao seu post" |
| `reaction` | Reação a post | "[user] reagiu ao seu post" |
| `follow` | Novo seguidor | "[user] começou a te seguir" |
| `mention` | Menção em post | "[user] te mencionou em um post" |
| `repost` | Echo do post | "[user] ecoou seu post" |
| `directMessage` | Nova DM | "[user] te enviou uma mensagem" |

### Comportamento
- **Deduplicação**: Mesma ação atualiza notificação existente
- **Auto-prevenção**: Usuário nunca recebe notificação de suas próprias ações
- **Queue Worker**: Job em background processa fila a cada 1 segundo com retry (até 5 tentativas)
- **Push**: Schema pronto (`push_subscriptions`), web-push preparado
- **Timestamps**: Formato relativo humanizado (PT/EN)
- **Gestão**: Marcar como lida (individual ou bulk)

---

## 11. 🏷️ Sistema de Tags ($Cordões)

### Sintaxe
- Prefixo `$` em vez de `#`: `$cyberpunk`, `$music`, `$tech`
- Validação segura: apenas `/^\$[\w]{1,30}$/`
- Renderização como links clicáveis → `/cordao/:tag`

### Trending $Cordões
- Extração de `$tags` dos posts das últimas 24h
- Top 20 por contagem de menções
- Disponível em `GET /api/posts/trending/cordoes`
- Suporte a time ranges customizados

### Tags Clickáveis
- Click em `$tag` navega para `/cordao/:tag`
- Feed filtrado mostra apenas posts com aquele $Cordão
- Prevenção de XSS na renderização

---

## 12. 🧬 Sistema de Bio Automática

O Chrono analisa automaticamente o comportamento do usuário para gerar uma bio dinâmica.

### Critérios Analisados (15+)
| Critério | Exemplo de Bio Gerada |
|----------|----------------------|
| Contagem de posts | "Criador prolífico de conteúdo" |
| Ratio likes/posts | "Curador de qualidade" |
| Tempo na plataforma | "Veterano da rede" |
| Contagem de seguidores | "Influenciador digital" |
| Atividade de comentários | "Engajador ativo" |
| Atividade recente | "Frequentador assíduo" / "Observador silencioso" |
| Posts com mídia | "Artista visual" |
| Threads criadas | "Mestre dos debates" |
| Horário de atividade | "Coruja noturna" / "Madrugador" |
| Enquetes criadas | "Democrata digital" |

### Endpoints
- `GET /api/bio/:userId/bio` — Retorna bio custom + auto + tags
- `POST /api/bio/:userId/bio/refresh` — Recalcula tags (auth required)
- `GET /api/bio/system/tags` — Lista todas as tags disponíveis

### Cron Job
- **Diariamente às 3:00 AM**: Processa todos os usuários ativos em batches
- Atualização incremental (adiciona novas, remove obsoletas)

---

## 13. 🏅 Sistema de Badges (21 Tags Comportamentais)

### 4 Categorias

#### ✅ Positive (5 tags)
| Tag | Ícone | Cor | Condição |
|-----|-------|-----|----------|
| Verificado | ✓ | Azul | Verificação manual |
| Popular | ⭐ | Dourado | >5000 reações |
| Mentor | 🎓 | Verde | Contribuidor ativo |
| Criativo | 🎨 | Rosa | Conteúdo diferenciado |
| Humorista | 😄 | Amarelo | Posts engraçados |

#### 🔨 Moderation (5 tags)
| Tag | Ícone | Cor | Condição |
|-----|-------|-----|----------|
| Advertido | ⚠️ | Laranja | Infração registrada |
| Silenciado | 🔇 | Cinza | Suspensão ativa |
| Banido | 🚫 | Vermelho | Ban permanente |
| Em Observação | 👁️ | Amarelo | Monitoramento |
| Restrito | 🔒 | Escuro | Funcionalidades limitadas |

#### ⏰ Time (5 tags)
| Tag | Ícone | Cor | Condição |
|-----|-------|-----|----------|
| Recém-chegado | 🌱 | Verde claro | Conta <7 dias |
| Veterano | 👑 | Ouro | >1 ano na plataforma |
| Pioneiro | 🚀 | Roxo | Primeiros 100 usuários |
| Ativo | 🔥 | Laranja | Atividade constante |
| Retornado | 🔄 | Azul | Voltou após inatividade |

#### 🎨 Style (6 tags)
| Tag | Ícone | Cor | Condição |
|-----|-------|-----|----------|
| Minimalista | ◻️ | Branco | Perfil limpo |
| Maximalista | ✨ | Rainbow | Perfil decorado |
| Fotógrafo | 📷 | Azul | Muitos posts com imagem |
| Escritor | ✍️ | Marrom | Posts longos |
| Streamer | 🎥 | Roxo | Conteúdo de vídeo |
| Colecionador | 🎒 | Verde | Muitos itens do marketplace |

### Auto-Cálculo
- **Cron a cada 6 horas**: Verifica e atualiza tags automáticas
- Funções: `updateNewcommerTag()`, `updatePopularTag()`, `updateAdvertidoTag()`, `updateSilenciadoTag()`
- Admin pode adicionar/remover tags manualmente

### Frontend
- `UserTagBadge.tsx` — Badge individual com cor e ícone
- `UserTags.tsx` — Lista de badges com modal de expansão
- Acessibilidade WCAG AA (contraste de cores)
- Suporte i18n (PT/EN)

---

## 14. 🧵 Threads (Cordões de Discussão)

### Conceito
Threads são espaços de discussão nomeados com título, descrição e status.

### Funcionalidades
- **Criação**: Título + descrição + status inicial (active)
- **Posts em thread**: Posts associados via `thread_id`
- **Auto-herança**: Replies herdam `thread_id` do post pai (trigger `enforce_reply_same_thread`)
- **Auditoria**: Toda mudança de status logada em `thread_audit`
- **Auto-arquivamento**: `archive_threads(cutoff_days)` archiva threads inativas (padrão 90 dias)
- **Duração**: Cálculo human-readable do tempo de vida

### Frontend
- **ThreadView** (`/thread/:postId`): Visualização da cadeia de replies com indentação visual
- Exibe contexto completo da conversa
- Navegação entre posts da thread

### Trending Threads
- Score = (reações × 1) + (replies × 2)
- Top 20 das últimas 24h
- `GET /api/posts/trending/threads`

---

## 15. 📊 Sistema de Enquetes (Polls)

### Criação
- Adicionar `poll_options` (JSONB) ao criar post
- Definir `poll_ends_at` para enquetes temporárias
- Múltiplas opções de resposta

### Votação
- 1 voto por usuário por enquete (UNIQUE constraint)
- `POST /api/posts/:id/poll/vote` com `option_index`
- Votos atualizam contagem JSONB no post
- Resultados exibidos em tempo real

### Frontend
- Composer de enquete no PostComposer
- Exibição de opções com barras de progresso no PostCard
- Timer visual para enquetes com prazo

---

## 16. ⏰ Cápsulas do Tempo

### Conceito
Posts que ficam "trancados" até uma data futura — uma forma única de comunicação temporal.

### Funcionamento
1. Autor define `unlock_at` ao criar o post
2. Até a data de desbloqueio, o conteúdo fica oculto para outros usuários
3. **O autor sempre pode ver** seu próprio conteúdo
4. Após `unlock_at`, o post é visível para todos (respeitando privacidade)

### Uso
- Mensagens para o futuro
- Revelações planejadas
- Conteúdo sazonal

---

## 17. 🤖 CyberCompanion (Glitchi)

### Conceito
Cada usuário pode ter um companheiro digital — uma criatura cyberpunk que evolui com interação.

### Tipos
| Tipo | Descrição |
|------|-----------|
| 🤖 **Robot** | Companheiro mecânico |
| 🔮 **Hologram** | Companheiro holográfico |
| 🛸 **Drone** | Companheiro aéreo |

### Sistema de Progressão
- **XP**: Ganha XP por interações
- **Level up**: `level × 100` XP para subir de nível
- **Mood**: happy, neutral, sad, excited, sleepy
- **Acessórios**: Customização via JSON array

### Glitchi Overlay
- Enviar "Glitchi" para outro usuário (limite: 3/24h)
- Animação overlay aparece na tela do destinatário
- `GlitchiOverlay.tsx` — componente de animação

### API
- `GET /api/companion` — Buscar companion
- `POST /api/companion` — Criar companion (nome + tipo)
- `POST /api/companion/interact` — Interagir (ganha XP)

---

## 18. 🛒 Marketplace de Cosméticos

### Tipos de Itens

| Tipo | Exemplos | Efeito |
|------|----------|--------|
| **Frame** | Neon Demon, Glitch Border, Retro Arcade, Golden Legend | Moldura ao redor do avatar |
| **Effect** | Matrix Rain, Hologram | Efeito visual no perfil |
| **Badge** | OG User | Badge especial exibido |
| **Theme** | (Customizável) | Skin visual do tema |

### Raridade
| Tier | Cor |
|------|-----|
| Common | Cinza |
| Rare | Azul |
| Epic | Roxo |
| Legendary | Dourado |

### Funcionalidades
- **Compra**: Mock payment (sem gateway real por enquanto)
- **Equip/Unequip**: Apenas 1 item por tipo equipado simultaneamente (transacional)
- **Theme Skin**: Items de tema alteram `user_settings.theme_skin` quando equipados
- **Inventário**: Visualização de todos os itens possuídos

### Subscriptions
| Tier | Duração | Benefícios |
|------|---------|------------|
| **Free** | Permanente | Funcionalidades base |
| **Pro** | 1 mês | Recursos premium |
| **Pro Plus** | 1 mês | Todos os recursos + exclusivos |

---

## 19. 🛡️ Painel Administrativo

### Acesso
- Login separado: `/admin/login`
- Master password (`ADMIN_MASTER_PASSWORD`)
- JWT admin separado com `ADMIN_JWT_SECRET`
- Sessão de 24h

### Módulos

#### Dashboard
- Total de usuários (ativos, banidos, verificados, premium, novos esta semana)
- Total de posts, conversas, mensagens, tags
- Médias de engajamento
- Feed de atividade recente

#### Gestão de Usuários
| Ação | Descrição |
|------|-----------|
| Listar | Todos os usuários com filtros |
| Visualizar | Perfil completo |
| Editar | Dados do usuário |
| Deletar | Remoção permanente |
| Ban/Unban | Banir/desbanir |
| Reset Password | Forçar reset de senha |
| Stats | Overview de estatísticas |

#### Gestão de Posts
- Listar, visualizar, editar, deletar
- Busca por usuário
- Cleanup de posts em branco

#### Gestão de Conversas
- Listar conversas
- Visualizar mensagens
- Deletar conversas ou mensagens individuais

#### Gestão de Tags
- CRUD completo de definições de tags
- Feature/Unfeature tags
- Atribuição manual a usuários
- Estatísticas de uso

#### Verificação
- Verificar/desverificar usuários
- Visualizar bloqueios
- Gerenciar assinaturas

### Auditoria
- Todas as ações admin logadas com IP, user-agent, timestamp
- Middleware `logAdminAction` automático

---

## 20. 🔒 Sistema de Segurança

### Vulnerabilidades Corrigidas (Auditoria de 07/02/2026)

| # | Vulnerabilidade | Severidade | Solução |
|---|----------------|-----------|---------|
| 1 | **XSS em Posts** | 🔴 CRÍTICA | Validação regex `/^\$[\w]{1,30}$/` |
| 2 | **JWT em localStorage** | 🔴 CRÍTICA | Migração → sessionStorage |
| 3 | **Memory Leaks Socket.io** | 🔴 CRÍTICA | Cleanup com refs |
| 4 | **Race Conditions** | 🔴 CRÍTICA | AbortController |
| 5 | **Tipos `any` em Auth** | 🔴 CRÍTICA | Interfaces tipadas |
| 6 | **userId Hardcoded** | 🔴 CRÍTICA | AuthContext |

### Rate Limiting

| Alvo | Janela | Max Requests |
|------|--------|-------------|
| API Global | 1 min | 1000 |
| Auth (login/registro) | 1 hora | 100 |
| Atualizações de perfil | 1 min | 300 |
| Criação de posts | 1 min | 100 |
| Chat (POST) | 1 min | 500 |
| Verificação de e-mail | 1 hora | 3/IP |

### Medidas de Segurança

| Camada | Proteção |
|--------|----------|
| **SQL** | Queries parametrizadas (prevenção de injection) |
| **XSS** | Validação regex + React HTML escaping |
| **Auth** | JWT em sessionStorage, validação de formato |
| **Senhas** | bcryptjs (10 rounds) |
| **Admin** | JWT separado, master password, audit logging |
| **CORS** | Whitelist-based com detecção de ambiente |
| **E-mail** | Verificação DNS MX + SMTP handshake |
| **Socket** | JWT authentication para WebSocket |
| **Rate Limit** | 5 camadas de rate limiting (express-rate-limit) |
| **Moderation** | Filtro de palavras-chave (extensível com IA) |
| **Proxy** | Trust proxy habilitado para Railway |
| **Cleanup** | Limpeza de rate limit store a cada hora |

---

## 21. 📈 Trending & Analytics (Data Slicer)

### Data Slicer Page (`/data-slicer`)
Dashboard de analytics com dados de trending da plataforma.

### Trending $Cordões
- Extrai padrões `$tag` dos posts das últimas 24h
- Top 20 por contagem de menções
- Suporte a time ranges customizados
- `GET /api/posts/trending/cordoes`

### Trending Threads
- Score = (reações × 1) + (replies × 2)
- Top 20 das últimas 24h
- `GET /api/posts/trending/threads`

---

## 22. 📧 Sistema de E-mail

### Configuração
- **Provider**: Gmail SMTP via Nodemailer
- **Variáveis**: `GMAIL_USER` + `GMAIL_APP_PASSWORD`
- **Fallback**: `MockEmailService` em development (log no console)

### E-mails de Verificação
- Templates HTML com estilo cyberpunk
- Token SHA-256 com expiração de 24h
- Link direto: `/verify-email/:token`
- Rate limit: 3/hora por IP, 3 tentativas totais

### Validação de E-mail no Registro
1. Validação de formato
2. Lookup DNS de registros MX
3. Handshake SMTP (RCPT TO) para verificar existência

---

## 23. 🌐 Internacionalização (i18n)

### Cobertura
- **Idiomas**: Português 🇧🇷 (padrão) + English 🇬🇧
- **Chaves**: 589 chaves de tradução
- **Cobertura**: 100% de todas as strings da interface

### Implementação
- **React Context**: `LanguageProvider` + hook `useTranslation()`
- **Persistência**: `localStorage` (key: `chrono_lang`) + `profileSettings.language` no DB
- **Interpolação**: `t('key', { count: 5 })` → "Mostrar 5 novos posts"
- **Fallback**: Idioma alvo → English → nome da chave
- **Performance**: Local (sem API calls), lazy-loaded, memoizado, ~5KB

### Áreas Cobertas
Auth, Timeline, Messaging, Profiles, Settings, Notifications, Errors, UI, Admin, Tags, Marketplace, Companion, Bio

---

## 24. 📡 API Completa — Todos os Endpoints

### Auth (`/api/auth`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/check-username` | ❌ | Verificar disponibilidade de username |
| POST | `/check-email` | ❌ | Verificar e-mail (MX + SMTP) |
| POST | `/register` | ❌ | Registrar novo usuário |
| POST | `/login` | ❌ | Login → JWT |
| POST | `/verify-email` | ❌ | Verificar e-mail com código |
| POST | `/forgot-password` | ❌ | Iniciar reset de senha |
| POST | `/reset-password` | ❌ | Reset com token |
| POST | `/change-password` | ✅ | Alterar senha |
| DELETE | `/delete-account` | ✅ | Deletar conta |
| GET | `/health` | ❌ | Health check |
| GET | `/me` | ✅ | Usuário autenticado |

### Verificação de E-mail (`/api/auth/email-verification`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/status` | Status da verificação |
| POST | `/send` | Enviar e-mail |
| POST | `/verify` | Verificar token |
| GET | `/verify/:token` | Verificar via link |
| POST | `/resend` | Reenviar e-mail |

### Users (`/api/users`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/search/:query` | Opcional | Buscar usuários (ILIKE, 20 results) |
| GET | `/:username` | Opcional | Perfil do usuário |
| PUT | `/:username` | ✅ | Atualizar perfil |
| POST | `/:username/follow` | ✅ | Seguir |
| POST | `/:username/unfollow` | ✅ | Deixar de seguir |
| POST | `/:username/block` | ✅ | Bloquear |
| DELETE | `/:username/block` | ✅ | Desbloquear |
| GET | `/:username/status` | Opcional | Status online |
| GET | `/:username/posts/count` | Opcional | Contagem de posts |
| POST | `/:username/glitchi` | ✅ | Enviar Glitchi (3/24h) |
| GET | `/me/audit-logs` | ✅ | Logs de auditoria |

### Posts (`/api/posts`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | ✅ | Feed paginado |
| GET | `/:id` | ✅ | Post com dados enriquecidos |
| POST | `/` | ✅ | Criar post (com moderação) |
| PUT | `/:id` | ✅ | Editar post |
| DELETE | `/:id` | ✅ | Deletar post |
| POST | `/:id/echo` | ✅ | Echo (repost) |
| POST | `/:id/reply` | ✅ | Responder |
| POST | `/:id/poll/vote` | ✅ | Votar em enquete |
| GET | `/trending/cordoes` | ❌ | Trending $Cordões (24h) |
| GET | `/trending/threads` | ❌ | Trending threads (24h) |

### Reactions (`/api/posts`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:postId/reactions` | Opcional | Contagem de reações |
| GET | `/:postId/reactions/details` | Opcional | Detalhes por tipo |
| POST | `/:postId/reactions` | ✅ | Adicionar/toggle reação |
| DELETE | `/:postId/reactions` | ✅ | Remover reação |
| POST | `/batch` | ❌ | Batch de reações |

### Chat (`/api/chat`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | ✅ | Conversas do usuário |
| POST | `/init` | ✅ | Encontrar/criar conversa |
| GET | `/:id/messages` | ✅ | Mensagens da conversa |
| POST | `/:id/messages` | ✅ | Enviar mensagem |
| POST | `/:id/read` | ✅ | Marcar como lida |
| POST | `/reindex/conversations` | ✅ | Re-indexar conversas |

### Notifications (`/api/notifications`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | ✅ | Notificações do usuário |
| PUT | `/:id/read` | ✅ | Marcar como lida |
| POST | `/read-all` | ✅ | Marcar todas como lidas |
| POST | `/push/subscribe` | ✅ | Inscrever push |
| POST | `/push/unsubscribe` | ✅ | Desinscrever push |

### Tags (`/api/tags`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/definitions` | ❌ | Definições públicas |
| GET | `/definitions/category/:cat` | ❌ | Filtrar por categoria |
| GET | `/user/:userId` | ❌ | Tags do usuário |
| POST | `/admin/add` | ✅ Admin | Atribuir tag manualmente |
| POST | `/admin/remove` | ✅ Admin | Remover tag |
| GET | `/admin/statistics` | ✅ Admin | Estatísticas |
| PUT | `/admin/definitions/:tagId` | ✅ Admin | Atualizar definição |

### Bio (`/api/bio`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:userId/bio` | ❌ | Bio (custom + auto + tags) |
| POST | `/:userId/bio/refresh` | ✅ | Recalcular bio tags |
| GET | `/system/tags` | ❌ | Tags disponíveis |

### Bookmarks (`/api/bookmarks`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | ✅ | Posts salvos |
| GET | `/ids` | ✅ | IDs dos posts salvos |
| POST | `/:postId` | ✅ | Salvar post |
| DELETE | `/:postId` | ✅ | Remover bookmark |

### Marketplace (`/api/marketplace`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/items` | ❌ | Listar itens (filtro por tipo) |
| GET | `/inventory` | ✅ | Inventário do usuário |
| POST | `/items/:id/purchase` | ✅ | Comprar item |
| POST | `/items/:id/equip` | ✅ | Equipar item |
| POST | `/items/:id/unequip` | ✅ | Desequipar item |
| POST | `/subscription` | ✅ | Comprar assinatura |

### Companion (`/api/companion`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | ✅ | Buscar companion |
| POST | `/` | ✅ | Criar companion |
| POST | `/interact` | ✅ | Interagir (XP) |

### Reports (`/api/reports`)
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/` | ✅ | Reportar conteúdo |

### Admin (`/api/admin/*`)
| Módulo | Endpoints Principais |
|--------|---------------------|
| **Auth** | Login, logout, verify |
| **Dashboard** | Stats completos, atividade recente |
| **Users** | CRUD, ban/unban, reset password, stats |
| **Posts** | CRUD, busca por usuário |
| **Conversations** | Listar, mensagens, deletar |
| **Verification** | Verify/unverify, blocks, subscriptions |
| **Tags** | CRUD, feature/unfeature |

---

## 25. 🎨 Frontend — Arquitetura Detalhada

### Rotas da Aplicação

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/welcome` | Welcome | Landing page |
| `/login` | LoginScreen | Login |
| `/register` | Register | Registro |
| `/verify` | Verify | Verificação de e-mail |
| `/verify-email/:token` | VerifyEmailPage | Verificação por link |
| `/forgot-password` | ForgotPassword | Recuperação de senha |
| `/reset-password` | ResetPassword | Reset com token |
| `/echoframe` | Dashboard | Feed principal (timeline horizontal) |
| `/echoframe/:dateSegment` | Dashboard | Feed com data específica |
| `/profile/:username` | ProfilePage | Perfil do usuário |
| `/@:username` | → Redirect | URL estilo rede social |
| `/settings` | SettingsPage | Configurações |
| `/data-slicer` | DataSlicerPage | Analytics/trending |
| `/cordao/:tag` | Dashboard | Feed filtrado por $tag |
| `/messages` | MessagingLayout | DMs (split view) |
| `/thread/:postId` | ThreadView | Cadeia de replies |
| `/post/:randomId` | PostDetail | Post compartilhável |
| `/admin/login` | AdminLogin | Login admin |
| `/admin/dashboard` | AdminDashboard | Painel admin (protegido) |
| `/error/*` | Error Pages | 404, 500, 403, 429, 503, timeout |

### React Contexts (8)

| Context | Função |
|---------|--------|
| `AuthContext` | Estado de autenticação do usuário |
| `SoundContext` | Efeitos sonoros (post, reply, notification, glitch) |
| `ToastContext` | Sistema de notificações toast |
| `FloatingChatContext` | Gestão de janelas de chat flutuantes |
| `MessageNotificationContext` | Badges de notificação de mensagens |
| `MessagesSidebarContext` | Estado da sidebar de mensagens |
| `AdminContext` | Estado do painel admin |
| `LanguageProvider` | i18n (idioma ativo, traduções) |

### Custom Hooks

| Hook | Função |
|------|--------|
| `useAppSession` | Gestão de sessão, auth, carregamento de dados |
| `useAppTheme` | Aplicação de tema baseado nas configurações |
| `useBio` | Fetch de bio automática e tags |
| `useDebounce` | Debounce de valores |
| `useHourlyRefresh` | Refresh periódico de dados |
| `useLocalStorage` | Estado persistente em localStorage |
| `useRealtimeFeed` | Updates em tempo real via WebSocket |
| `useTags` | Gestão de tags do usuário |
| `useTranslation` | i18n — `t()`, `language`, `setLanguage` |

### Temas & Personalização
- **Temas**: Dark / Light
- **Cores de Destaque**: Purple, Green, Amber, Red, Blue
- **Efeitos Visuais**: None, Scanline, Glitch Overlay
- **Animações**: Toggle de animações
- **Sons**: Post, reply, notification, glitch

### Tratamento de Erros
- **ErrorBoundary**: Captura erros React globais
- **Páginas de Erro Cyberpunk**: 404, 500, 403, 429, 503, Timeout — cada uma com estética temática
- **Toast Notifications**: Success, error, info
- **Loading States**: Skeleton components

---

## 26. ⚙️ Backend — Serviços e Middleware

### 17 Serviços

| Serviço | Responsabilidades |
|---------|-------------------|
| `PostService` | CRUD de posts, replies, reposts, cápsulas do tempo |
| `UserService` | CRUD de usuários, autenticação, perfil, verificação |
| `ReactionService` | Adicionar/toggle/remover reações, batch loading |
| `ChatService` | Conversas, mensagens, find-or-create, status de leitura |
| `CompanionService` | CyberCompanion CRUD, XP, mood, leveling |
| `MarketplaceService` | Itens, inventário, compra, equip, assinaturas |
| `SecurityService` | Audit logging (ação, recurso, IP, user-agent) |
| `ModerationService` | Filtro de conteúdo (keywords + placeholder IA) |
| `TrendingService` | Cálculo de trending $Cordões e threads |
| `PollService` | Votação em enquetes, contagem |
| `ThreadService` | CRUD de threads, auto-arquivo, duração |
| `TagService` | Atribuição/remoção automática de tags, scheduled |
| `UserBioService` | Bio auto-gerada, auto-tags, stats do usuário |
| `NotificationService` | Criar/ler/marcar notificações, queue worker |
| `FollowService` | Follow/unfollow, contagens, listas |
| `EmailService` | Gmail SMTP, e-mails de verificação, tokens |
| `MockEmailService` | E-mail via console para desenvolvimento |

### Middleware

| Middleware | Função |
|-----------|--------|
| `authenticateToken` | Verificação JWT obrigatória |
| `optionalAuthenticateToken` | JWT opcional (guests permitidos) |
| `requireAdmin` | Verificação JWT admin (segredo separado) |
| `logAdminAction` | Log de ações admin (IP, user-agent) |
| `verificationRateLimit` | Rate limit de verificação (3/hora/IP) |
| `requireVerifiedEmail` | Bloqueia acesso sem e-mail verificado |
| `errorHandler` | Respostas de erro padronizadas |
| Rate Limiters (5) | API, auth, profile, post, chat |
| CORS | Origin whitelist + detecção de ambiente |
| Socket.io Auth | JWT para conexões WebSocket |

### Cron Jobs

| Job | Schedule | Função |
|-----|----------|--------|
| Tag Update Cycle | A cada 6 horas | newcomer, popular, advertido, silenciado |
| Bio Tag Update | Diário às 3:00 AM | Processa todos os usuários ativos em batches |
| Rate Limit Cleanup | A cada hora | Remove entradas stale do rate limiter |

---

## 27. 🚀 Deploy & Infraestrutura

### Docker Compose (Desenvolvimento)
```yaml
# PostgreSQL 15 Alpine
Container: chrono_postgres
User: postgres / postgres
Database: chrono_db
Port: 5432
Volume: postgres_data (persistente)
Healthcheck: pg_isready
```

### Dockerfile (Produção)
```dockerfile
# Node 20 Alpine
# Install: root + server dependencies
# Build: Frontend (Vite) + Backend (TypeScript)
# Expose: 3001
# Start: npm start
```

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `JWT_SECRET` | ✅ | Segredo JWT (servidor não inicia sem) |
| `DATABASE_URL` | ❌ | Connection string PostgreSQL |
| `PORT` | ❌ | Porta do servidor (padrão: 3001) |
| `HOST` | ❌ | Host (padrão: 0.0.0.0) |
| `NODE_ENV` | ❌ | Ambiente (production/development) |
| `CORS_ORIGIN` | ❌ | Origem CORS |
| `ADMIN_JWT_SECRET` | ❌ | Segredo JWT admin |
| `ADMIN_MASTER_PASSWORD` | ❌ | Senha master do admin |
| `ADMIN_USER_ID` | ❌ | UUID do admin |
| `GMAIL_USER` | ❌ | E-mail Gmail |
| `GMAIL_APP_PASSWORD` | ❌ | App password Gmail |
| `FRONTEND_URL` | ❌ | URL do frontend |
| `SMTP_FROM_EMAIL` | ❌ | E-mail de envio |
| `SMTP_FROM_NAME` | ❌ | Nome de envio |
| `GEMINI_API_KEY` | ❌ | API key do Google Gemini |

### Configuração do Servidor

| Setting | Valor |
|---------|-------|
| Porta | `PORT` ou 3001 |
| Host | `HOST` ou `0.0.0.0` |
| Body limit | 50MB (JSON + URL-encoded) |
| Cache estático | 1 ano para `/assets/` |
| Trust proxy | Level 1 |
| Socket.io | WebSocket + polling |
| Pool DB | Max 20 conexões |
| Connect timeout | 30s |
| Idle timeout | 15s |

### Plataformas de Deploy
- **Railway**: Auto-deploy via GitHub push, nixpacks.toml + railway.json
- **Render**: Suporte configurado com CORS
- **Docker**: docker-compose para development, Dockerfile para produção

---

## 28. 🔍 Auditoria de Segurança

### Relatório de 07/02/2026

**Status**: ✅ Build bem-sucedido | 121 módulos | 563.21 KB (149.21 KB gzip)

**29 problemas identificados**, 6 CRÍTICOS corrigidos:

1. ✅ **XSS em Posts** — Validação regex segura para tags/menções
2. ✅ **JWT Token Storage** — localStorage → sessionStorage com validação
3. ✅ **Memory Leaks** — Cleanup de event listeners em Socket.io
4. ✅ **Race Conditions** — AbortController para requests concorrentes
5. ✅ **Type Safety** — Interfaces tipadas em auth
6. ✅ **Error Handling** — ErrorBoundary global

### Medidas Implementadas

**Prevenção de XSS**:
- Regex estrita para tags: `/^\$[\w]{1,30}$/`
- React HTML escaping automático
- Validação de emojis em usernames

**Segurança de Dados**:
- Queries parametrizadas (SQL injection prevention)
- Password hashing bcryptjs (10 rounds)
- Token SHA-256 para verificação de e-mail
- E2E encryption preparado (public_key em users)

**Segurança de Sessão**:
- JWT em sessionStorage (limpo ao fechar aba)
- Validação de formato JWT antes do armazenamento
- Secrets separados para user/admin
- Session timeout de 24h para admin

---

## 29. 🗺️ Problemas Conhecidos & Roadmap

### Pendente de Implementação
- [ ] Upload direto de mídia (atualmente apenas URLs)
- [ ] Notificações em tempo real via WebSocket (parcialmente implementado)
- [ ] Salas de conversa em grupo (schema definido, não implementado)
- [ ] Trending algoritmo avançado
- [ ] Web Push notifications (schema pronto)
- [ ] CSRF Protection no backend
- [ ] E2E encryption para mensagens (chaves públicas no schema)
- [ ] Google OAuth (google_id no schema)
- [ ] Stories/Fleets temporários (feature removida/deprecated)

### Melhorias Sugeridas
- [ ] Otimizar N+1 queries em `enrichPost` (batch loading)
- [ ] Implementar Error Logger (Sentry/LogRocket)
- [ ] Rate limiting no frontend
- [ ] Cleanup de console.log statements
- [ ] Integration/E2E/Security/Performance tests
- [ ] Compartilhamento externo de posts
- [ ] Listas de usuários

---

## 30. 📝 Notas do Desenvolvedor

> *"O site é bem simples, tem um login, um registro, um perfil, um feed de posts... Ou seja.... ELE NÃO É SIMPLES... É A CARALHA DE UMA REDE SOCIAL INTEIRA."*

> *"A Chrono tenta revolucionar toda a indústria batendo de frente com o Twitter e o Threads."*

> *"Agora são 1 e meia da manhã, estou com muito sono, e quero resolver as porcarias que estão acontecendo no site, antes que o beta-tester me arranque a cabeça e me prenda em um daqueles quadros chiques de animais na parede."*

> *"Só hoje já foram feitos 32 commits, e mais de 2 litros de café foram consumidos. E só não tomo rebite porque tenho amor na minha vida."*

> *"No git estamos pelo menos progredindo um cadinho, já temos 40 commits totais e pelo menos 26 com resultados positivos."*

> 

### Versões Utilizadas
| Tecnologia | Versão |
|-----------|--------|
| React | 19.2.0 |
| TypeScript | 5.8.2 |
| Vite | 6.2.0 |
| Node.js | 20.x |
| Express | 4.18.2 |
| PostgreSQL | 15 |
| Socket.io | 4.8.3 |
| Zustand | 5.0.11 |

---

<div align="center">

**⏳ CHRONO — Temporal Social Network**

*Desenvolvido com 💜 e muita cafeína por [Juvinho](https://github.com/Juvinho)*

*"O futuro já chegou, só não está uniformemente distribuído." — William Gibson*

---

**Dossiê gerado em 24 de Fevereiro de 2026**

</div>
