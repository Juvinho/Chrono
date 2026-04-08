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
export const useSocketMessages = (conversationId: number | string | null) => {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const callbackRef = useRef<((message: Message) => void) | null>(null);

  // Set callback to be called when new message arrives
  const setOnNewMessage = useCallback((callback: (message: Message) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    try {
      const socket = getSocket();
      socketRef.current = socket;

      // Join conversation room for this specific conversation
      socket.emit('join_conversation', { conversationId });
      console.log(`✅ Joined conversation room: ${conversationId}`);

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
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_updated', handleConversationUpdated);
        socket.emit('leave_conversation', { conversationId });
        console.log(`✅ Left conversation room: ${conversationId}`);
      };
    } catch (error) {
      console.error('❌ Error setting up Socket.io listeners:', error);
    }
  }, [conversationId]);

  return {
    setOnNewMessage,
  };
};
