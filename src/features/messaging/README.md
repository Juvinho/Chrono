# Sistema de Mensagens - Facebook Messenger Style

## 📋 Visão Geral

Sistema completo de mensagens em tempo real desenvolvido com:
- **Frontend**: React + TypeScript + CSS customizado
- **Backend**: Node.js/Express + PostgreSQL
- **Arquitetura**: Componentes modulares reutilizáveis

## 🎯 Estrutura do Projeto

```
src/features/messaging/
├── components/           # Componentes React
│   ├── MessagingLayout.tsx      # Container principal
│   ├── ConversationList.tsx     # Sidebar com lista de conversas
│   ├── ChatArea.tsx             # Área principal do chat
│   ├── MessageList.tsx          # Lista de mensagens
│   ├── MessageInput.tsx         # Input para enviar mensagens
│   └── index.ts
├── hooks/               # Custom hooks React
│   ├── useConversations.ts      # Gerencia conversas
│   ├── useMessages.ts           # Gerencia mensagens
│   └── index.ts
├── api/                 # Comunicação com backend
│   └── messagingApi.ts          # Chamadas REST
├── types/               # TypeScript types
│   └── index.ts
├── utils/               # Utilidades
│   └── formatTimestamp.ts       # Formatação de datas/horas
└── styles/              # CSS
    └── messaging.css            # Estilos principais
```

## 🚀 Como Usar

### 1. Acessar a página de mensagens

Quando usuário clica em "Enviar Mensagem" no perfil de outro usuário, é redirecionado para:
```
/messages?state={selectedConversationId: number}
```

### 2. Componentes principais

#### MessagingLayout
Container principal que organiza sidebar e chat area.

```tsx
<MessagingLayout />
```

#### ConversationList
Mostra todas as conversas do usuário autenticado com:
- Avatar do outro usuário
- Última mensagem (preview)
- Data/hora no formato inteligente
- Badge com contagem de não lidos

#### ChatArea
Mostra mensagens da conversa selecionada com:
- Header com dados do outro usuário
- Lista de mensagens com bubbles coloridas
- Input para enviar novas mensagens
- Auto-scroll para última mensagem

## 🔌 API Endpoints

### Conversas
```
GET    /api/conversations                # Lista todas as conversas
POST   /api/conversations/init           # Cria/busca conversa com usuário
```

### Mensagens
```
GET    /api/conversations/{id}/messages  # Lista mensagens
POST   /api/conversations/{id}/messages  # Envia nova mensagem
```

## 📦 Dependências Internas

- `baseClient` do `src/api/client.ts` - Cliente HTTP com autenticação
- `useConversations` - Hook para gerenciar lista de conversas
- `useMessages` - Hook para gerenciar mensagens de uma conversa
- `formatTimestamp` - Função para formatar data/hora estilo Facebook

## 🎨 Estilos

### Classes principais

```css
.messaging-layout          /* Container principal */
.messaging-sidebar         /* Sidebar (lista de conversas) */
.messaging-main            /* Área do chat */
.conversation-list         /* Lista de conversas */
.conversation-item         /* Item individual */
.chat-area                 /* Área do chat */
.chat-messages             /* Container de mensagens */
.message-bubble            /* Bolha individual */
.message-input             /* Input de envio */
```

### Cores e temas

- Fundo: `#fff`, secundário: `#f0f2f5`, terciário: `#e4e6eb`
- Texto principal: `#050505`, secundário: `#65676b`
- Destaque (azul): `#0084ff`
- Gradiente de avatar: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

## 🌟 Features Implementados

✅ **Conversas**
- Find or Create padrão (Facebook Messenger)
- Lista com ordenação por data
- Preview da última mensagem
- Badge de não lidos

✅ **Mensagens**
- Envio com Enter (Enter sem Shift = enviar, Shift+Enter = quebra de linha)
- Auto-scroll para última mensagem
- Bubbles diferenciadas (minhas à direita em azul, outras à esquerda em cinza)
- Timestamps inteligentes (Hoje, Ontem, esta semana, data completa)

✅ **UI/UX**
- Design limpo e moderno
- Responsivo para mobile
- Carregamento com spinners
- Tratamento de erros
- Estados vazios com mensagens amigáveis

## 📝 TODO (Funcionalidades Futuras)

- [ ] WebSocket em tempo real com Socket.io
- [ ] Indicador "digitando..."
- [ ] Read receipts automáticos (visto)
- [ ] Status online
- [ ] Contagem de mensagens não lidas
- [ ] Busca de mensagens
- [ ] Suporte a imagens/mídia
- [ ] Emoji picker
- [ ] Reações em mensagens
- [ ] Editar mensagens
- [ ] Deletar mensagens
- [ ] Suporte a grupos (mais de 2 participantes)

## 🔐 Autenticação

O sistema usa o `baseClient` que inclui:
- Token JWT automaticamente
- Headers de autenticação
- Rate limiting
- Timeout de 15 segundos

## 💾 Dados Persistidos

Todos os dados são salvos no PostgreSQL em:
- `conversations` - Informações das conversas
- `conversation_participants` - Participantes de cada conversa
- `messages` - Conteúdo das mensagens
- `message_status` - Status de leitura

## 🐛 Troubleshooting

### Conversas não carregam
- Verifique se token JWT está válido
- Cheque console para erros de rede
- Verifique se `/api/conversations` responde

### Mensagens antigas não aparecem
- Verifique ordenação (deve ser ASC por created_at)
- Cheque se conversationId está correto

### Erro ao enviar mensagem
- Verifique se content não está vazio
- Cheque se conversationId é válido
- Verifique permissões de usuário

## 📚 Referências

- [Estrutura do guia de implementação](../../Correções.md)
- [Tipos TypeScript](./types/index.ts)
- [API Client principal](../../api/client.ts)
- [Services do backend](../../server/src/services/chatService.ts)
