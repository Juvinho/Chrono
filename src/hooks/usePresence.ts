import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socketService';

/**
 * Hook for tracking which users are currently online (C-07)
 * 
 * Listens to Socket.io events:
 * - user:online: User just connected
 * - user:offline: User just disconnected
 * 
 * Returns: {
 *   isOnline: (userId: string | number) => boolean
 *   onlineUsers: Set<string>
 * }
 */
export const usePresence = () => {
  const socket = getSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const onlineUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    // Handler for user coming online
    const handleUserOnline = (data: { userId: string | number; username: string; timestamp: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(String(data.userId));
        onlineUsersRef.current = newSet;
        return newSet;
      });
    };

    // Handler for user going offline
    const handleUserOffline = (data: { userId: string | number; username: string; timestamp: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(String(data.userId));
        onlineUsersRef.current = newSet;
        return newSet;
      });
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket]);

  // Check if a specific user is online
  const isOnline = useCallback((userId: string | number): boolean => {
    return onlineUsersRef.current.has(String(userId));
  }, []);

  return {
    isOnline,
    onlineUsers,
  };
};
