import { useState, useEffect, useRef } from 'react';
import { Conversation } from '../types';
import { getConversations } from '../api/messagingApi';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getConversations();
      setConversations(data);
      
      console.log('✅ Conversas carregadas:', data.length);
    } catch (err) {
      console.error('❌ Erro ao carregar conversas:', err);
      setError('Falha ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carrega conversas ao iniciar
    fetchConversations();

    // Inicia polling a cada 3 segundos
    pollingIntervalRef.current = setInterval(() => {
      fetchConversations();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
