# 📨 IMPLEMENTAÇÃO COMPLETA: Sistema de Envio de Mensagens Diretas

## 🎯 OBJETIVO
Implementar funcionalidade completa de envio de mensagens diretas no ChatDrawer, garantindo:
- Criação automática de conversas
- Envio de mensagens com validação
- Notificações em tempo real via Socket.io
- Tratamento de erros robusto
- Feedback visual ao usuário

---

## 1️⃣ BANCO DE DADOS (JÁ EXISTENTE - VERIFICAÇÃO)

### Schema SQL (Já implementado em `server/src/db/schema.sql`)

```sql
-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participantes da Conversa (com Foreign Keys)
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- Mensagens (com Foreign Keys)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'sent',
    is_encrypted BOOLEAN DEFAULT FALSE,
    delete_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status das Mensagens (per-user)
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);
```

**✅ Status:** Banco de dados já está configurado corretamente com Foreign Keys e CASCADE.

---

## 2️⃣ BACKEND (ROTA E SERVIÇO)

### 2.1 Rota de Envio de Mensagem
**Arquivo:** `server/src/routes/conversations.ts`

**Código existente (linhas 118-150):**
```typescript
// Send message
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text, media } = req.body;

    // ✅ VALIDAÇÃO: Verifica se texto ou mídia foi enviado
    if (!text && !media) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    // ✅ SEGURANÇA: authenticateToken middleware garante req.userId existe
    const message = await conversationService.sendMessage(id, req.userId!, text, media);

    // ✅ NOTIFICAÇÃO: Cria notificação para o destinatário
    const conv = await pool.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [id, req.userId]
    );

    if (conv.rows.length > 0) {
      const recipientId = conv.rows[0].user_id;
      await notificationService.createNotification(recipientId, req.userId!, 'directMessage');
    }

    const sender = await userService.getUserById(req.userId!);

    // ✅ RESPOSTA: Retorna mensagem com senderUsername
    res.status(201).json({
      ...message,
      senderUsername: sender?.username || 'unknown',
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});
```

### 2.2 Serviço de Conversação
**Arquivo:** `server/src/services/conversationService.ts`

**Método sendMessage (linhas 66-164):**
- ✅ Valida se usuário é participante
- ✅ Suporta mensagens criptografadas
- ✅ Atualiza contador de não lidas
- ✅ Emite evento Socket.io para tempo real

**Socket.io Integration (linhas 140-161):**
```typescript
// Emit real-time message
try {
    const io = getIo();
    const senderResult = await pool.query('SELECT username FROM users WHERE id = $1', [senderId]);
    const senderUsername = senderResult.rows[0]?.username || 'Unknown';

    const payload = {
        ...message,
        senderUsername,
        conversationId
    };

    // Emite para a sala da conversa
    io.to(`conversation:${conversationId}`).emit('new_message', payload);
} catch (error) {
    console.error('Failed to emit message:', error);
}
```

**✅ Status:** Backend já está completo e funcional.

---

## 3️⃣ FRONTEND (COMPONENTE E API)

### 3.1 Cliente API
**Arquivo:** `src/utils/api.ts`

**Método sendMessageToUser (linhas 293-300):**
```typescript
async sendMessageToUser(recipientUsername: string, text: string, media?: { imageUrl?: string, videoUrl?: string, metadata?: any }) {
  // Primeiro cria ou busca a conversa
  const conv = await this.getOrCreateConversation(recipientUsername);
  if (conv.data) {
      return this.sendMessage(conv.data.conversationId, text, media);
  }
  return conv;
}
```

**✅ Status:** API client já está implementado corretamente.

### 3.2 Componente ChatDrawer (CORREÇÃO NECESSÁRIA)
**Arquivo:** `src/features/messages/components/ChatDrawer.tsx`

**PROBLEMA IDENTIFICADO:**
- Linha 83: `apiClient.sendMessage(activeChatUser.username, textToSend)` está INCORRETO
- Deveria usar `sendMessageToUser` que cria/busca conversa automaticamente

**SOLUÇÃO:** Ver arquivo corrigido abaixo.

---

## 4️⃣ INTEGRAÇÃO COMPLETA (CORREÇÕES)

### 4.1 Correção do ChatDrawer

**ARQUIVO:** `src/features/messages/components/ChatDrawer.tsx`

**ALTERAÇÕES NECESSÁRIAS:**

1. **Importar useToast:**
```typescript
import { useToast } from '../../../contexts/ToastContext';
```

2. **Corrigir função handleSendMessage:**
```typescript
const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChatUser || isLoading) return;

    const textToSend = messageText.trim();
    setMessageText(''); // Limpa input otimisticamente
    setIsLoading(true);

    try {
        // ✅ USA sendMessageToUser que cria/busca conversa automaticamente
        const response = await apiClient.sendMessageToUser(activeChatUser.username, textToSend);
        
        if (response.error) {
            throw new Error(response.error);
        }

        // ✅ FEEDBACK DE SUCESSO
        showToast('Mensagem enviada!', 'success');
        
        // Scroll para última mensagem
        setTimeout(() => scrollToBottom(), 100);
        
    } catch (error: any) {
        // ✅ FEEDBACK DE ERRO
        const errorMessage = error.message || 'Erro ao enviar mensagem. Tente novamente.';
        showToast(errorMessage, 'error');
        
        // Restaura texto no input em caso de erro
        setMessageText(textToSend);
        
        console.error('Failed to send message:', error);
    } finally {
        setIsLoading(false);
    }
};
```

3. **Adicionar estado de loading no botão:**
```typescript
<button 
    type="submit" 
    disabled={!messageText.trim() || isLoading}
    className="p-2 bg-[var(--theme-primary)] text-white rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
>
    {isLoading ? (
        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : (
        <SendIcon className="w-5 h-5" />
    )}
</button>
```

---

## 5️⃣ MAPEAMENTO DE VARIÁVEIS (FRONT ↔ BACK)

### Request (Frontend → Backend):
```typescript
// Frontend envia:
{
  text: "Olá, como vai?",
  media?: { imageUrl?: string, videoUrl?: string }
}

// Backend recebe em:
req.body.text
req.body.media
```

### Response (Backend → Frontend):
```typescript
// Backend retorna:
{
  id: "uuid-da-mensagem",
  conversationId: "uuid-da-conversa",
  senderId: "uuid-do-remetente",
  text: "Olá, como vai?",
  senderUsername: "nome_do_usuario",
  timestamp: "2024-01-01T12:00:00Z",
  status: "sent",
  ...
}

// Frontend acessa:
response.data.id
response.data.text
response.data.senderUsername
response.data.timestamp
```

**✅ NOMES BATEM EXATAMENTE:** `senderUsername`, `text`, `timestamp` são consistentes.

---

## 6️⃣ SOCKET.IO (TEMPO REAL)

### 6.1 Backend emite evento:
**Arquivo:** `server/src/services/conversationService.ts` (linha 155)
```typescript
io.to(`conversation:${conversationId}`).emit('new_message', payload);
```

### 6.2 Frontend escuta evento:
**Arquivo:** `src/App.tsx` (linhas 345-410)
```typescript
const handleNewMessage = async (payload: any) => {
    // Atualiza conversas com nova mensagem
    setConversations(prev => {
        // Lógica de atualização...
    });
};
```

**✅ Status:** Socket.io já está integrado e funcionando.

---

## 7️⃣ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Banco de dados com Foreign Keys
- [x] Backend com validação e segurança
- [x] Socket.io para tempo real
- [ ] **Frontend com tratamento de erros (CORRIGIR)**
- [ ] **Feedback visual com toast (CORRIGIR)**
- [ ] **Loading state no botão (CORRIGIR)**

---

## 8️⃣ PRÓXIMOS PASSOS

1. Aplicar correções no `ChatDrawer.tsx`
2. Testar envio de mensagem
3. Verificar notificações em tempo real
4. Validar tratamento de erros

**TODAS AS CORREÇÕES ESTÃO DOCUMENTADAS ACIMA!**
