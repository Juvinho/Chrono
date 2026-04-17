import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessageRequest } from '../types';
import { getMessages, sendMessage } from '../api/messagingApi';
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

export function useMessages(conversationId: number | string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const previousMessagesLengthRef = useRef<number>(0);
  
  const { playSound } = useSound();
  const { incrementUnread, isPageVisible } = useMessageNotification();
  const { setOnNewMessage } = useSocketMessages(conversationId);
  const { user } = useAuth();

  // Carrega mensagens com debounce
  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) {
      return;
    }

    // SECURITY FIX C-14: Reject legacy numeric conversation IDs
    const idStr = String(conversationId);
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
      const idStr = String(conversationId);
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
  }, [conversationId, playSound, incrementUnread, isPageVisible]);

  // Envia mensagem
  const handleSendMessage = async (content: string, imageUrl?: string) => {
    // Permite enviar se tem conteúdo OU imagem
    if (!conversationId || (!content.trim() && !imageUrl)) {
      console.warn('⚠️ Cannot send message:', {
        hasConversationId: !!conversationId,
        conversationId,
        contentValid: content.trim().length > 0,
        hasImage: !!imageUrl
      });
      return;
    }

    try {
      setIsSending(true);
      
      const request: SendMessageRequest = {
        conversationId: String(conversationId),
        content: content.trim(),
        ...(imageUrl && { imageUrl }),
      };
      
      console.log('📤 Sending message:', {
        conversationId,
        contentLength: content.trim().length,
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
      
      console.log('✅ Mensagem enviada:', newMessage.id);
    } catch (err: any) {
      console.error('❌ Erro ao enviar mensagem:', {
        message: err?.message,
        error: err,
        conversationId
      });
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Inicia carregamento inicial e listeners Socket.io
  useEffect(() => {
    if (!conversationId) {
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
      if (String(newMessage.conversationId) !== String(conversationId)) {
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
  }, [conversationId, setOnNewMessage, user, playSound, incrementUnread, isPageVisible]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSendMessage,
  };
}
