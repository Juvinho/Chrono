// Real-time feed updates via Socket.io WebSocket connection
import { useEffect, useRef } from 'react';
import { Post } from '../types/index';
import { getSocket } from '../services/socketService';
import { Socket } from 'socket.io-client';

let onNewPost: ((post: Post) => void) | null = null;

export function setOnNewPostCallback(callback: (post: Post) => void) {
  onNewPost = callback;
}

export function useRealtimeFeed(onPost?: (post: Post) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!onPost && !onNewPost) {
      console.log('[useRealtimeFeed] No callback provided');
      return;
    }

    try {
      const socket = getSocket();
      socketRef.current = socket;

      // Listen for new posts broadcast to all connected clients
      const handleNewPost = (post: Post) => {
        console.log('📨 New post received via WebSocket:', post.id);
        
        // Call the provided callback first
        if (onPost) {
          onPost(post);
        }
        
        // Also call the legacy callback if set
        if (onNewPost) {
          onNewPost(post);
        }
      };

      socket.on('post_added', handleNewPost);

      // Listen for post reactions/updates
      const handlePostUpdated = (post: Post) => {
        console.log('🔄 Post updated via WebSocket:', post.id);
        if (onPost) {
          onPost(post);
        }
      };

      socket.on('post_updated', handlePostUpdated);

      return () => {
        // Clean up listeners when component unmounts or hook dependencies change
        socket.off('post_added', handleNewPost);
        socket.off('post_updated', handlePostUpdated);
      };
    } catch (error) {
      console.error('[useRealtimeFeed] Failed to setup WebSocket:', error);
    }
  }, [onPost]);

  return {
    isConnected: socketRef.current?.connected || false,
  };
}
