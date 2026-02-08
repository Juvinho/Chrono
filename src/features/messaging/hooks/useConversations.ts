import { useState, useEffect, useRef } from 'react';
import { Conversation } from '../types';
import { getConversations } from '../api/messagingApi';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetriesRef = useRef<number>(3);

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
      
      setConversations(data);
      setError(null);
      retryCountRef.current = 0;
      
      console.log('✅ Conversas carregadas:', data.length);
    } catch (err: any) {
      console.error('❌ Erro ao carregar conversas:', {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        retry: retryCountRef.current
      });
      
      // Retry logic para erros temporários
      if (retryCountRef.current < maxRetriesRef.current) {
        retryCountRef.current++;
        console.log(`🔄 Tentativa ${retryCountRef.current}/${maxRetriesRef.current}...`);
        
        // Aguarda 1 segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchConversations(true);
      }
      
      // Se mesmo após retries continuar offline, tenta restaurar do cache
      const cachedConversations = sessionStorage.getItem('cachedConversations');
      if (cachedConversations) {
        try {
          const cached = JSON.parse(cachedConversations);
          if (Array.isArray(cached) && cached.length > 0) {
            setConversations(cached);
            setError('⚠️ Usando dados em cache (conexão perdida)');
            console.log('📦 Usando conversas em cache:', cached.length);
            return;
          }
        } catch (cacheErr) {
          console.error('Erro ao restaurar cache:', cacheErr);
        }
      }
      
      setError('Falha ao carregar conversas. Verifique sua conexão.');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carrega conversas ao iniciar
    fetchConversations();

    // Inicia polling a cada 3 segundos (menos frequente que antes para economizar banda)
    pollingIntervalRef.current = setInterval(() => {
      fetchConversations();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Salva conversas em cache sempre que mudam
  useEffect(() => {
    if (conversations.length > 0) {
      sessionStorage.setItem('cachedConversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
