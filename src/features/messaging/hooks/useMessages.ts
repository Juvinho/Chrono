import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessageRequest } from '../types';
import { getMessages, sendMessage, initConversation } from '../api/messagingApi';
import { useSound } from '../../../contexts/SoundContext';
import { useMessageNotification } from '../../../contexts/MessageNotificationContext';
import { useSocketMessages } from './useSocketMessages';
import { useAuth } from '../../../contexts/AuthContext';

// SECURITY FIX C-14: Validate conversation IDs to prevent accessing legacy numeric IDs
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const isLegacyId = (id: unknown): boolean => {
  const idStr = String(id);
  // Legacy IDs are numeric (like "900", "2", etc.) not UUIDs
  return /^\d+$/.test(idStr);
};

const isConversationNotFoundError = (err: unknown): boolean => {
  const msg = String((err as any)?.message || (err as any)?.error || '').toLowerCase();
  return msg.includes('conversation not found') || msg.includes('conversa não encontrada');
};

interface UseMessagesOptions {
  targetUserId?: string;
}

export function useMessages(conversationId: number | string | null, options: UseMessagesOptions = {}) {
  const { targetUserId } = options;
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ? String(conversationId) : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const previousMessagesLengthRef = useRef<number>(0);
  
  const { playSound } = useSound();
  const { incrementUnread, isPageVisible } = useMessageNotification();
  const { setOnNewMessage } = useSocketMessages(activeConversationId);
  const { user } = useAuth();

  useEffect(() => {
    setActiveConversationId(conversationId ? String(conversationId) : null);
  }, [conversationId]);

  // Carrega mensagens com debounce
  const fetchMessages = useCallback(async () => {
    if (!activeConversationId || isFetchingRef.current) {
      return;
    }

    // SECURITY FIX C-14: Reject legacy numeric conversation IDs
    const idStr = String(activeConversationId);
    if (isLegacyId(idStr)) {
      console.error(`❌ Legacy conversation ID detected: ${idStr}. Refusing to load messages.`);
      setError(`ID de conversa inválido: ${idStr}. Por favor, selecione uma conversa válida.`);
      isFetchingRef.current = false;
      return;
    }

    // Evita múltiplas requisições simultâneas
    isFetchingRef.current = true;
    const now = Date.now();

    // Mínimo de 2 segundos entre requisições
    if (now - lastFetchRef.current < 2000) {
      isFetchingRef.current = false;
      return;
    }

    lastFetchRef.current = now;
    setIsLoading(true);

    try {
      // Always coerce to string — the API route expects a UUID string
      const idStr = String(activeConversationId);
      console.log(`📨 Buscando mensagens para conversa ID: ${idStr}`);
      const data = await getMessages(idStr);
      console.log(`✅ Mensagens carregadas:`, {
        total: data.length,
      });
      
      // Detecta novas mensagens recebidas
      if (data.length > previousMessagesLengthRef.current) {
        const newMessagesCount = data.length - previousMessagesLengthRef.current;
        console.log(`🔊 Nova(s) mensagem(ns) recebida(s): ${newMessagesCount}`);
        
        // Som já é tocado via ChatContext (socket.io)
        // Apenas incrementa unread se página não visível
        if (!isPageVisible) {
          console.log('🔔 Incrementando unread (página escondida)');
          incrementUnread(newMessagesCount);
        }
      }
      
      previousMessagesLengthRef.current = data.length;
      setMessages(data);
      setError(null);
    } catch (err: any) {
      if (isConversationNotFoundError(err) && targetUserId && isValidUUID(targetUserId)) {
        try {
          console.warn('⚠️ Conversation not found on fetch. Recovering conversation via initConversation...', {
            activeConversationId,
            targetUserId,
          });
          const recovered = await initConversation(targetUserId);
          if (recovered?.id && isValidUUID(String(recovered.id))) {
            setActiveConversationId(String(recovered.id));
            setError(null);
            return;
          }
        } catch (recoveryError) {
          console.error('❌ Failed to recover conversation on fetch:', recoveryError);
        }
      }

      console.error('❌ Erro ao carregar mensagens:', err);
      // Show detailed error in development, generic message in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? err?.message || 'Falha ao carregar mensagens'
        : 'Falha ao carregar mensagens. Tente novamente.';
      setError(errorMessage);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [activeConversationId, targetUserId, playSound, incrementUnread, isPageVisible]);

  // Envia mensagem
  const handleSendMessage = async (content: string, imageUrl?: string) => {
    const normalizedContent = typeof content === 'string' ? content : '';
    const trimmedContent = normalizedContent.trim();

    // Permite enviar se tem conteúdo OU imagem
    if (!activeConversationId || (!trimmedContent && !imageUrl)) {
      console.warn('⚠️ Cannot send message:', {
        hasConversationId: !!activeConversationId,
        conversationId: activeConversationId,
        contentValid: trimmedContent.length > 0,
        hasImage: !!imageUrl
      });
      return;
    }

    const request: SendMessageRequest = {
      conversationId: String(activeConversationId),
      content: trimmedContent,
      ...(imageUrl && { imageUrl }),
    };

    try {
      setIsSending(true);
      
      console.log('📤 Sending message:', {
        conversationId: activeConversationId,
        contentLength: trimmedContent.length,
        hasImage: !!imageUrl,
        request
      });
      
      const newMessage = await sendMessage(request);
      
      // Reproduz som ao enviar
      playSound('message_send');
      
      // Adiciona mensagem à lista
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        const next = [...prev, newMessage];
        previousMessagesLengthRef.current = next.length;
        return next;
      });

      setError(null);
      
      console.log('✅ Mensagem enviada:', newMessage.id);
    } catch (err: any) {
      if (isConversationNotFoundError(err) && targetUserId && isValidUUID(targetUserId)) {
        try {
          console.warn('⚠️ Conversation not found on send. Recovering and retrying...', {
            activeConversationId,
            targetUserId,
          });

          const recovered = await initConversation(targetUserId);
          const recoveredId = recovered?.id ? String(recovered.id) : '';
          if (isValidUUID(recoveredId)) {
            setActiveConversationId(recoveredId);

            const retriedMessage = await sendMessage({
              ...request,
              conversationId: recoveredId,
            });

            playSound('message_send');

            setMessages((prev) => {
              if (prev.some((m) => m.id === retriedMessage.id)) {
                return prev;
              }
              const next = [...prev, retriedMessage];
              previousMessagesLengthRef.current = next.length;
              return next;
            });

            setError(null);
            console.log('✅ Mensagem enviada após recuperar conversa:', retriedMessage.id);
            return;
          }
        } catch (recoveryError) {
          console.error('❌ Failed to recover conversation on send:', recoveryError);
        }
      }

      console.error('❌ Erro ao enviar mensagem:', {
        message: err?.message,
        error: err,
        conversationId: activeConversationId
      });
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Inicia carregamento inicial e listeners Socket.io
  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    // Reset state when switching conversations
    setMessages([]);
    setError(null);
    setIsLoading(true);
    lastFetchRef.current = 0;        // Reset debounce timer
    isFetchingRef.current = false;   // Reset fetch lock
    previousMessagesLengthRef.current = 0;  // Reset message count tracking

    // Carrega mensagens ao iniciar
    fetchMessages();

    // Setup Socket.io listener for new messages (I-10: replaces polling)
    setOnNewMessage((newMessage: Message) => {
      if (String(newMessage.conversationId) !== String(activeConversationId)) {
        return;
      }

      if (user && String(newMessage.sender?.id) === String(user.id)) {
        return;
      }

      console.log(`🔊 Nova mensagem recebida via Socket.io: ${newMessage.id}`);
      
      // Toca som apenas para mensagens de outros usuários
      playSound('message_receive');
      
      // Adiciona à lista sem duplicar
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        const next = [...prev, newMessage];
        previousMessagesLengthRef.current = next.length;
        return next;
      });
      
      // Incrementa unread if page not visible
      if (!isPageVisible) {
        console.log('🔔 Incrementando unread (página escondida)');
        incrementUnread(1);
      }
    });

    return () => {
      // Cleanup handled by useSocketMessages hook
    };
  }, [activeConversationId, setOnNewMessage, user, playSound, incrementUnread, isPageVisible]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSendMessage,
  };
}
