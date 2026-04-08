import { useState, useEffect, useRef } from 'react';
import { Conversation } from '../types';
import { getConversations } from '../api/messagingApi';
import { useSocketConversations } from './useSocketConversations';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetriesRef = useRef<number>(3);
  const lastSuccessfulDataRef = useRef<Conversation[]>([]); // Guardar último resultado bem-sucedido
  
  // Socket.io listeners for real-time updates (I-10: replaces 3-second polling)
  const { setOnConversationUpdate, setOnNewConversation, setOnConversationDelete } = useSocketConversations();

  const fetchConversations = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
        setError(null);
        retryCountRef.current = 0;
      }
      
      const data = await getConversations();
      
      if (!Array.isArray(data)) {
        throw new Error('Resposta inválida: esperado array de conversas');
      }
      
      // ✅ Sucesso! Atualiza conversas
      setConversations(data);
      lastSuccessfulDataRef.current = data; // Salva em ref também
      setError(null);
      retryCountRef.current = 0;
      
      console.log('✅ Conversas carregadas:', {
        count: data.length,
        conversationIds: data.map(c => c.id)
      });
    } catch (err: any) {
      console.error('❌ Erro ao carregar conversas:', {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        retry: retryCountRef.current,
        lastSuccessfulCount: lastSuccessfulDataRef.current.length
      });
      
      // Retry logic para erros temporários
      if (retryCountRef.current < maxRetriesRef.current) {
        retryCountRef.current++;
        console.log(`🔄 Tentativa ${retryCountRef.current}/${maxRetriesRef.current}...`);
        
        // Aguarda 1 segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchConversations(true);
      }
      
      // SECURITY FIX: Removed sessionStorage caching for private messages (C-14)
      // Conversations contain sensitive data that should not be persisted on disk
      // Only use in-memory cache via lastSuccessfulDataRef
      
      // Só mostra erro se realmente não tem dados anteriores
      if (lastSuccessfulDataRef.current.length === 0) {
        setError('Falha ao carregar conversas. Verifique sua conexão.');
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carrega conversas ao iniciar
    fetchConversations(false);

    // Setup Socket.io listener for real-time conversation updates (I-10: replaces 3-second polling)
    setOnConversationUpdate((data: any) => {
      console.log(`📍 Atualizando conversa via Socket.io: ${data.id}`);
      
      // Atualiza conversa existente ou adiciona nova
      setConversations((prev) => {
        const existingIndex = prev.findIndex(c => c.id === data.id);
        if (existingIndex >= 0) {
          // Atualiza conversa existente
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...data,
          };
          return updated;
        } else {
          // Nova conversa (fallback)
          return prev;
        }
      });
    });

    setOnNewConversation((conversation: Conversation) => {
      console.log(`✨ Nova conversa recebida via Socket.io: ${conversation.id}`);
      
      // Adiciona nova conversa à lista
      setConversations((prev) => {
        // Evita duplicatas
        if (prev.some(c => c.id === conversation.id)) {
          return prev;
        }
        return [conversation, ...prev];
      });
    });

    setOnConversationDelete((conversationId: string | number) => {
      console.log(`🗑️ Conversa deletada via Socket.io: ${conversationId}`);
      
      // Remove conversa deletada
      setConversations((prev) => prev.filter(c => c.id !== conversationId));
    });

    return () => {
      // Cleanup handled by useSocketConversations hook
    };
  }, [setOnConversationUpdate, setOnNewConversation, setOnConversationDelete]);

  return {
    conversations,
    isLoading,
    error,
    refetch: () => fetchConversations(false),
  };
}
