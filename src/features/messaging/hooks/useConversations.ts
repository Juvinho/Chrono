import { useState, useEffect } from 'react';
import { Conversation } from '../types';
import { getConversations } from '../api/messagingApi';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    fetchConversations();
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
