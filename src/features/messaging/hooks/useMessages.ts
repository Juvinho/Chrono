import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessageRequest } from '../types';
import { getMessages, sendMessage } from '../api/messagingApi';

export function useMessages(conversationId: number | string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

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
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError('Falha ao carregar mensagens');
    } finally {
      isFetchingRef.current = false;
    }
  }, [conversationId]);

  // Envia mensagem
  const handleSendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) {
      console.warn('⚠️ Cannot send message:', {
        hasConversationId: !!conversationId,
        conversationId,
        contentValid: content.trim().length > 0
      });
      return;
    }

    try {
      setIsSending(true);
      
      const request: SendMessageRequest = {
        conversationId,
        content: content.trim(),
      };
      
      console.log('📤 Sending message:', {
        conversationId,
        contentLength: content.trim().length,
      });
      
      const newMessage = await sendMessage(request);
      
      // Adiciona mensagem à lista
      setMessages((prev) => [...prev, newMessage]);
      
      console.log('✅ Mensagem enviada:', newMessage.id);
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
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

    // Inicia polling a cada 5 segundos (aumentado de 3 para reduzir piscadas)
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);

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
