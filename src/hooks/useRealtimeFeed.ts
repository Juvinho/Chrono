// ✅ HOOK COMPLETO PARA POSTS EM TEMPO REAL
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Post } from '../types/index';

// Callback para quando novo post chega
let onNewPost: ((post: Post) => void) | null = null;

export function setOnNewPostCallback(callback: (post: Post) => void) {
  onNewPost = callback;
}

export function useRealtimeFeed() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get token from storage
    const token = sessionStorage.getItem('chrono_token') || localStorage.getItem('chrono_token');
    
    if (!token) {
      console.warn('[useRealtimeFeed] Sem token, WebSocket desabilitado');
      return;
    }

    // Connect to WebSocket
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // ✅ LISTEN para novos posts
    socketRef.current.on('post_added', (newPost: Post) => {
      console.log('[📡 useRealtimeFeed] Novo post recebido:', newPost.id);
      
      // Callback para o componente que está ouvindo
      if (onNewPost) {
        onNewPost(newPost);
      }
    });

    socketRef.current.on('connect', () => {
      console.log('[✅ useRealtimeFeed] WebSocket conectado');
    });

    socketRef.current.on('disconnect', () => {
      console.log('[❌ useRealtimeFeed] WebSocket desconectado');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
}
