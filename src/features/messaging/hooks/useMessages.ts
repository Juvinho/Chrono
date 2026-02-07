import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessageRequest } from '../types';
import { getMessages, sendMessage } from '../api/messagingApi';

export function useMessages(conversationId: number | string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega mensagens
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      console.warn('⚠️ conversationId não definido:', conversationId);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`📨 Buscando mensagens para conversa ID: ${conversationId}`);
      const data = await getMessages(conversationId);
      console.log(`✅ Mensagens carregadas:`, {
        total: data.length,
        data: data
      });
      setMessages(data);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError('Falha ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Envia mensagem
  const handleSendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) {
      console.warn('⚠️ Cannot send message:', {
        hasConversationId: !!conversationId,
        conversationId,
        conversationIdType: typeof conversationId,
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
        conversationIdType: typeof conversationId,
        contentLength: content.trim().length,
        endpoint: `/chat/${conversationId}/messages`
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

  // Inicia polling automático
  useEffect(() => {
    if (!conversationId) return;

    // Carrega mensagens ao iniciar
    fetchMessages();

    // Inicia polling a cada 3 segundos (aumentado de 2 para melhor com rate limiting)
    // Com rate limiting geral de 300 req/min, 3s = 20 req/min por usuário é seguro
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [conversationId, fetchMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSendMessage,
    refetch: fetchMessages,
  };
}
