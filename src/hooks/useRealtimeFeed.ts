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
    console.log('[useRealtimeFeed] 🔌 useEffect iniciado');
    
    // Get token from storage
    const token = sessionStorage.getItem('chrono_token') || localStorage.getItem('chrono_token');
    
    if (!token) {
      console.warn('[useRealtimeFeed] ⚠️ Sem token, feed em tempo real desabilitado');
      return;
    }

    try {
      // Polling alternativo: verificar novos posts a cada 3 segundos
      const apiUrl = import.meta.env.VITE_API_URL;
      
      console.log('%c[useRealtimeFeed] 📡 ✅ ATIVANDO POLLING DE POSTS (3s intervalo)', 'background:#00ff00;color:#000;font-weight:bold;font-size:14px');
      console.log('[useRealtimeFeed] 🌐 API URL:', apiUrl);
      console.log('[useRealtimeFeed] 🔑 Token:', token.substring(0, 30) + '...');

      // Callback inicial para testar se polling está rodando
      let pollingAttempts = 0;

      pollingIntervalRef.current = setInterval(async () => {
        pollingAttempts++;
        console.log(`[useRealtimeFeed] 🔄 Polling ciclo #${pollingAttempts}`);
        
        try {
          console.log('[useRealtimeFeed] 📥 Buscando posts de:', `${apiUrl}/posts?limit=10`);
          
          // Buscar últimos posts
          const response = await fetch(`${apiUrl}/posts?limit=10`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('[useRealtimeFeed] 📊 Status da resposta:', response.status);

          if (!response.ok) {
            console.error('[useRealtimeFeed] ❌ Erro HTTP:', response.status, response.statusText);
            return;
          }

          const data = await response.json();
          const posts = data.data || [];
          
          console.log('[useRealtimeFeed] 📦 Posts recebidos:', posts.length);

          // Verificar se há posts mais novos que o último registrado
          if (posts.length > 0) {
            const newestPost = posts[0];
            const newestTimestamp = new Date(newestPost.created_at).getTime();

            console.log('[useRealtimeFeed] 🕐 Post mais novo:', newestPost.id, 'Timestamp:', newestTimestamp, 'Último registrado:', lastPostTimestampRef.current);

            if (newestTimestamp > lastPostTimestampRef.current) {
              console.log('%c[useRealtimeFeed] 📬 ✅ NOVO POST DETECTADO via polling', 'background:#00ff00;color:#000;font-weight:bold;font-size:14px');
              console.log('[useRealtimeFeed] Post ID:', newestPost.id);
              console.log('[useRealtimeFeed] Autor:', newestPost.author?.username);
              
              lastPostTimestampRef.current = newestTimestamp;

              if (onNewPost) {
                console.log('[useRealtimeFeed] 🔔 Acionando callback onNewPost');
                onNewPost(newestPost);
              } else {
                console.error('[useRealtimeFeed] ❌ onNewPost não está definido!');
              }
            } else {
              console.log('[useRealtimeFeed] ⏭️ Post não é novo (já processado)');
            }
          } else {
            console.log('[useRealtimeFeed] ℹ️ Nenhum post encontrado');
          }
        } catch (error: any) {
          console.error('[useRealtimeFeed] 💥 Erro durante polling:', error?.message || error);
          console.error('[useRealtimeFeed] Stack:', error?.stack);
        }
      }, 3000);

      console.log('%c[useRealtimeFeed] ✅ Polling iniciado com sucesso', 'background:#0080ff;color:#fff;font-weight:bold');

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
