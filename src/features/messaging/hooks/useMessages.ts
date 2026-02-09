import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessageRequest } from '../types';
import { getMessages, sendMessage } from '../api/messagingApi';
import { useSound } from '../../../contexts/SoundContext';
import { useMessageNotification } from '../../../contexts/MessageNotificationContext';

export function useMessages(conversationId: number | string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const previousMessagesLengthRef = useRef<number>(0);
  
  const { playSound } = useSound();
  const { incrementUnread, isPageVisible } = useMessageNotification();

  // Carrega mensagens com debounce
  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) {
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

    try {
      console.log(`📨 Buscando mensagens para conversa ID: ${conversationId}`);
      const data = await getMessages(conversationId);
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
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError('Falha ao carregar mensagens');
    } finally {
      isFetchingRef.current = false;
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
        conversationId,
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
      setMessages((prev) => [...prev, newMessage]);
      previousMessagesLengthRef.current += 1;
      
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

  // Inicia polling automático - apenas quando conversationId muda
  useEffect(() => {
    if (!conversationId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Carrega mensagens ao iniciar
    fetchMessages();

    // Inicia polling a cada 3 segundos para detecção mais rápida de novas mensagens
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [conversationId]); // Remover fetchMessages das dependências

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSendMessage,
  };
}
