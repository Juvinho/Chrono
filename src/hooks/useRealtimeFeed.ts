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
      console.warn('[useRealtimeFeed] ⚠️ Sem token, WebSocket desabilitado');
      return;
    }

    try {
      // Determinar URL do servidor - Socket.io precisa da URL base sem /api
      const apiUrl = import.meta.env.VITE_API_URL;
      const baseUrl = apiUrl?.replace('/api', '') || 'https://chrono.railway.app';
      console.log('[useRealtimeFeed] 🔌 Tentando conectar ao Socket.io:', baseUrl);

      // Connect to WebSocket com configuração CORS agressiva
      socketRef.current = io(baseUrl, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling', 'http_long_polling'],
        withCredentials: true,
        secure: false,
      });

      // ✅ LISTEN para novos posts
      socketRef.current.on('post_added', (newPost: Post) => {
        console.log('[✅ useRealtimeFeed] 📡 Novo post recebido:', newPost.id);
        
        // Callback para o componente que está ouvindo
        if (onNewPost) {
          onNewPost(newPost);
        }
      });

      socketRef.current.on('connect', () => {
        console.log('[✅ useRealtimeFeed] ✅ WebSocket conectado com sucesso!');
        console.log('[✅ useRealtimeFeed] 🔗 Transport:', socketRef.current?.io?.engine?.transport?.name);
      });

      // ✅ Teste de conectividade ping/pong
      socketRef.current.on('ping_from_server', (data: any) => {
        console.log('[✅ useRealtimeFeed] 🏓 Ping recebido do servidor:', data);
        socketRef.current?.emit('pong_from_client');
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('[useRealtimeFeed] ❌ WebSocket desconectado:', reason);
      });

      socketRef.current.on('connect_error', (error: any) => {
        console.error('[useRealtimeFeed] 🚨 Erro de conexão:', error?.message || error);
      });

      socketRef.current.on('error', (error: any) => {
        console.error('[useRealtimeFeed] 🚨 Socket error:', error);
      });
    } catch (error) {
      console.error('[useRealtimeFeed] 🚨 Erro ao criar Socket.io:', error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('[useRealtimeFeed] 🔌 Socket desconectado no cleanup');
      }
    };
  }, []);

  return socketRef.current;
}
