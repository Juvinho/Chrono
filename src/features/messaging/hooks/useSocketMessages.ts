import { useEffect, useCallback, useRef } from 'react';
import { Message } from '../types';
import { getSocket } from '../../../services/socketService';

/**
 * Hook for real-time message updates via Socket.io (I-10)
 * 
 * Replaces 3-second polling interval with Socket.io listeners
 * Reduces HTTP requests from 2000+/min to <10/min
 * 
 * Listens to Socket.io events:
 * - new_message: New message received in conversation
 * - conversation_updated: Conversation metadata updated
 * 
 * Usage:
 * const { onNewMessage } = useSocketMessages(conversationId);
 * // Call onNewMessage callback when setting up listeners
 */

// SECURITY FIX C-14: Validate conversation IDs to prevent accessing legacy numeric IDs
const isLegacyId = (id: unknown): boolean => {
  const idStr = String(id);
  // Legacy IDs are numeric (like "900", "2", etc.) not UUIDs
  return /^\d+$/.test(idStr);
};

export const useSocketMessages = (conversationId: number | string | null) => {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const callbackRef = useRef<((message: Message) => void) | null>(null);

  // Set callback to be called when new message arrives
  const setOnNewMessage = useCallback((callback: (message: Message) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    // SECURITY FIX C-14: Prevent connecting to socket rooms with legacy numeric IDs
    if (!conversationId || isLegacyId(conversationId)) {
      if (conversationId && isLegacyId(conversationId)) {
        console.warn(`⚠️ Skipping Socket.io connection for legacy conversation ID: ${conversationId}`);
      }
      return;
    }

    try {
      const socket = getSocket();
      socketRef.current = socket;
      const roomId = String(conversationId);

      const joinConversationRoom = () => {
        socket.emit('join_conversation', roomId);
        console.log(`✅ Joined conversation room: ${roomId}`);
      };

      // Join conversation room for this specific conversation
      joinConversationRoom();

      // Rejoin room after reconnection (rooms are server-memory only).
      socket.on('connect', joinConversationRoom);

      // Handler for new messages
      const handleNewMessage = (message: Message) => {
        console.log('📨 New message via Socket.io:', {
          messageId: message.id,
          senderId: message.sender?.id,
          conversationId,
          timestamp: new Date().toISOString()
        });
        
        if (callbackRef.current) {
          callbackRef.current(message);
        }
      };

      // Handler for conversation updates
      const handleConversationUpdated = (data: any) => {
        console.log('🔄 Conversation updated via Socket.io:', {
          conversationId: data.id,
          timestamp: new Date().toISOString()
        });
      };

      socket.on('new_message', handleNewMessage);
      socket.on('conversation_updated', handleConversationUpdated);

      return () => {
        socket.off('connect', joinConversationRoom);
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_updated', handleConversationUpdated);
        socket.emit('leave_conversation', roomId);
        console.log(`✅ Left conversation room: ${roomId}`);
      };
    } catch (error) {
      console.error('❌ Error setting up Socket.io listeners:', error);
    }
  }, [conversationId]);

  return {
    setOnNewMessage,
  };
};
