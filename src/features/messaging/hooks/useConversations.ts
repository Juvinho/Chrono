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
  const lastSuccessfulDataRef = useRef<Conversation[]>([]); // Guardar último resultado bem-sucedido

  const fetchConversations = async (isRetry = false, isPolling = false) => {
    try {
      if (!isRetry) {
        if (!isPolling) {
          setIsLoading(true);
        }
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
        isPolling,
        conversationIds: data.map(c => c.id)
      });
    } catch (err: any) {
      console.error('❌ Erro ao carregar conversas:', {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        retry: retryCountRef.current,
        isPolling,
        lastSuccessfulCount: lastSuccessfulDataRef.current.length
      });
      
      // Se é polling e temos dados anteriores, não limpa (pode ser erro temporário)
      if (isPolling && lastSuccessfulDataRef.current.length > 0) {
        console.log('📌 Mantendo conversas anteriores durante polling');
        return;
      }
      
      // Retry logic para erros temporários (apenas se não for polling)
      if (!isPolling && retryCountRef.current < maxRetriesRef.current) {
        retryCountRef.current++;
        console.log(`🔄 Tentativa ${retryCountRef.current}/${maxRetriesRef.current}...`);
        
        // Aguarda 1 segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchConversations(true, false);
      }
      
      // Se mesmo após retries continuar offline, tenta restaurar do cache
      const cachedConversations = sessionStorage.getItem('cachedConversations');
      if (cachedConversations) {
        try {
          const cached = JSON.parse(cachedConversations);
          if (Array.isArray(cached) && cached.length > 0) {
            setConversations(cached);
            lastSuccessfulDataRef.current = cached;
            setError('⚠️ Usando dados em cache (conexão perdida)');
            console.log('📦 Usando conversas em cache:', cached.length);
            return;
          }
        } catch (cacheErr) {
          console.error('Erro ao restaurar cache:', cacheErr);
        }
      }
      
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
    fetchConversations(false, false);

    // Inicia polling a cada 3 segundos
    pollingIntervalRef.current = setInterval(() => {
      fetchConversations(false, true); // isPolling = true
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
    refetch: (isPolling = false) => fetchConversations(false, isPolling),
  };
}
