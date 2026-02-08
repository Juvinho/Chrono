// ✅ HOOK PARA FEED EM TEMPO REAL - POLLING ALTERNATIVO
import { useEffect, useRef } from 'react';
import { Post } from '../types/index';

// Callback para quando novo post chega
let onNewPost: ((post: Post) => void) | null = null;

export function setOnNewPostCallback(callback: (post: Post) => void) {
  onNewPost = callback;
}

export function useRealtimeFeed() {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPostTimestampRef = useRef<number>(0);

  useEffect(() => {
    // Get token from storage
    const token = sessionStorage.getItem('chrono_token') || localStorage.getItem('chrono_token');
    
    if (!token) {
      console.warn('[useRealtimeFeed] ⚠️ Sem token, feed em tempo real desabilitado');
      return;
    }

    try {
      // Polling alternativo: verificar novos posts a cada 3 segundos
      const apiUrl = import.meta.env.VITE_API_URL;
      
      console.log('[useRealtimeFeed] 📡 ✅ ATIVANDO POLLING DE POSTS (3s intervalo)');
      console.log('[useRealtimeFeed] 🔌 Usando API polling em vez de WebSocket');

      pollingIntervalRef.current = setInterval(async () => {
        try {
          // Buscar últimos posts
          const response = await fetch(`${apiUrl}/posts?limit=10`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            if (response.status !== 401) {
              console.error('[useRealtimeFeed] ❌ Erro ao buscar posts:', response.status);
            }
            return;
          }

          const data = await response.json();
          const posts = data.data || [];

          // Verificar se há posts mais novos que o último registrado
          if (posts.length > 0) {
            const newestPost = posts[0];
            const newestTimestamp = new Date(newestPost.created_at).getTime();

            if (newestTimestamp > lastPostTimestampRef.current) {
              console.log('[useRealtimeFeed] 📬 ✅ Novo post detectado via polling:', newestPost.id);
              lastPostTimestampRef.current = newestTimestamp;

              if (onNewPost) {
                onNewPost(newestPost);
              }
            }
          }
        } catch (error: any) {
          if (!error.message.includes('Failed to fetch')) {
            console.debug('[useRealtimeFeed] 🔄 Polling ciclo...');
          }
        }
      }, 3000);

      console.log('[useRealtimeFeed] ✅ Polling iniciado - novos posts serão verificados a cada 3 segundos');

    } catch (error) {
      console.error('[useRealtimeFeed] 🚨 Erro ao inicializar feed em tempo real:', error);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        console.log('[useRealtimeFeed] 🔌 Polling desabilitado no cleanup');
      }
    };
  }, []);

  return null;
}
