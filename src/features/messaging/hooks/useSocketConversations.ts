import { useEffect, useCallback, useRef } from 'react';
import { Conversation } from '../types';
import { getSocket } from '../../../services/socketService';

/**
 * Hook for real-time conversation updates via Socket.io (I-10)
 * 
 * Replaces 3-second polling interval with Socket.io listeners
 * Reduces HTTP requests from 2000+/min to <10/min
 * 
 * Listens to Socket.io events:
 * - conversation_updated: Conversation metadata or last message changed
 * - new_conversation: A new conversation was created
 * - conversation_deleted: A conversation was deleted
 * 
 * Usage:
 * const { setOnConversationUpdate, setOnNewConversation } = useSocketConversations();
 */
export const useSocketConversations = () => {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const onUpdateCallbackRef = useRef<((data: any) => void) | null>(null);
  const onNewCallbackRef = useRef<((conversation: Conversation) => void) | null>(null);
  const onDeleteCallbackRef = useRef<((conversationId: string | number) => void) | null>(null);

  // Set callbacks to be called when conversation events occur
  const setOnConversationUpdate = useCallback((callback: (data: any) => void) => {
    onUpdateCallbackRef.current = callback;
  }, []);

  const setOnNewConversation = useCallback((callback: (conversation: Conversation) => void) => {
    onNewCallbackRef.current = callback;
  }, []);

  const setOnConversationDelete = useCallback((callback: (conversationId: string | number) => void) => {
    onDeleteCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    try {
      const socket = getSocket();
      socketRef.current = socket;

      // Handler for conversation updates
      const handleConversationUpdated = (data: any) => {
        console.log('🔄 Conversation updated via Socket.io:', {
          conversationId: data.id,
          timestamp: new Date().toISOString()
        });
        
        if (onUpdateCallbackRef.current) {
          onUpdateCallbackRef.current(data);
        }
      };

      // Handler for new conversations
      const handleNewConversation = (conversation: Conversation) => {
        console.log('✨ New conversation via Socket.io:', {
          conversationId: conversation.id,
          timestamp: new Date().toISOString()
        });
        
        if (onNewCallbackRef.current) {
          onNewCallbackRef.current(conversation);
        }
      };

      // Handler for deleted conversations
      const handleConversationDeleted = (data: { conversationId: string | number }) => {
        console.log('🗑️ Conversation deleted via Socket.io:', {
          conversationId: data.conversationId,
          timestamp: new Date().toISOString()
        });
        
        if (onDeleteCallbackRef.current) {
          onDeleteCallbackRef.current(data.conversationId);
        }
      };

      socket.on('conversation_updated', handleConversationUpdated);
      socket.on('new_conversation', handleNewConversation);
      socket.on('conversation_deleted', handleConversationDeleted);

      return () => {
        socket.off('conversation_updated', handleConversationUpdated);
        socket.off('new_conversation', handleNewConversation);
        socket.off('conversation_deleted', handleConversationDeleted);
      };
    } catch (error) {
      console.error('❌ Error setting up Socket.io conversation listeners:', error);
    }
  }, []);

  return {
    setOnConversationUpdate,
    setOnNewConversation,
    setOnConversationDelete,
  };
};
