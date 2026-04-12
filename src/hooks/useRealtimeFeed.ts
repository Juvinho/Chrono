// Real-time feed updates via Socket.io WebSocket connection
import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socketService';
import { Socket } from 'socket.io-client';

type RealtimeFeedHandlers = {
  onPostAdded?: (post: any) => void;
  onPostUpdated?: (post: any) => void;
  onPostDeleted?: (payload: { id?: string } | string) => void;
};

export function useRealtimeFeed(handlers: RealtimeFeedHandlers = {}) {
  const socketRef = useRef<Socket | null>(null);
  const { onPostAdded, onPostUpdated, onPostDeleted } = handlers;

  useEffect(() => {
    if (!onPostAdded && !onPostUpdated && !onPostDeleted) {
      console.log('[useRealtimeFeed] No callback provided');
      return;
    }

    try {
      const socket = getSocket();
      socketRef.current = socket;

      // Listen for new posts broadcast to all connected clients
      const handleNewPost = (post: any) => {
        console.log('📨 New post received via WebSocket:', post.id);
        onPostAdded?.(post);
      };

      socket.on('post_added', handleNewPost);

      // Listen for post reactions/updates
      const handlePostUpdated = (post: any) => {
        console.log('🔄 Post updated via WebSocket:', post.id);
        onPostUpdated?.(post);
      };

      socket.on('post_updated', handlePostUpdated);

      const handlePostDeleted = (payload: { id?: string } | string) => {
        const postId = typeof payload === 'string' ? payload : payload?.id;
        console.log('🗑️ Post deleted via WebSocket:', postId || 'unknown');
        onPostDeleted?.(payload);
      };

      socket.on('post_deleted', handlePostDeleted);

      return () => {
        // Clean up listeners when component unmounts or hook dependencies change
        socket.off('post_added', handleNewPost);
        socket.off('post_updated', handlePostUpdated);
        socket.off('post_deleted', handlePostDeleted);
      };
    } catch (error) {
      console.error('[useRealtimeFeed] Failed to setup WebSocket:', error);
    }
  }, [onPostAdded, onPostDeleted, onPostUpdated]);

  return {
    isConnected: socketRef.current?.connected || false,
  };
}
