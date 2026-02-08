import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { apiClient } from '../../api/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video';
  created_at: string;
  sender_username?: string;
  sender_avatar?: string;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  other_username: string;
  other_avatar: string;
  other_user_id: string;
  last_message_content?: string;
  last_message_time?: string;
  updated_at: string;
}

interface ChatContextType {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, type?: 'text' | 'image' | 'video') => Promise<void>;
  initConversation: (targetUserId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  let playSound: ((type: 'notification' | 'post' | 'reply' | 'like' | 'follow' | 'blim' | 'message_send' | 'message_receive' | 'message_background') => void) | null = null;
  
  try {
    const soundContext = useSound();
    playSound = soundContext.playSound;
  } catch (e) {
    // Sound context may not be available
  }
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Array<{ event: string; handler: Function }>>([]);

  // Initialize Socket - ONLY once per user authentication
  useEffect(() => {
    if (!user) return;

    // Prevent multiple socket connections
    if (socketRef.current) {
      return;
    }

    // Get token from sessionStorage or localStorage
    const token = sessionStorage.getItem('chrono_token') || localStorage.getItem('chrono_token');
    
    if (!token) {
      console.warn('[Chat] No auth token available for Socket.io connection');
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      withCredentials: true,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Define event handlers before attaching
    const onConnect = () => {
      console.log('[Chat] Socket connected');
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log('[Chat] Socket disconnected');
      setIsConnected(false);
    };

    const onError = (error: any) => {
      console.error('[Chat] Socket error:', error);
    };

    const onNewMessage = (message: Message) => {
      // Play sound notification for new message
      if (playSound) {
        playSound('message_background');
      }
      
      setMessages((prev) => [...prev, message]);
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === message.conversation_id) {
            return {
              ...conv,
              last_message_content: message.content,
              last_message_time: message.created_at,
              updated_at: message.created_at,
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    };

    const onConversationUpdated = (conversationUpdate: any) => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === conversationUpdate.id) {
            return {
              ...conv,
              last_message_content: conversationUpdate.lastMessage?.content,
              last_message_time: conversationUpdate.lastMessage?.sentAt,
              updated_at: conversationUpdate.updatedAt,
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    };

    // Attach listeners
    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);
    newSocket.on('error', onError);
    newSocket.on('new_message', onNewMessage);
    newSocket.on('conversation_updated', onConversationUpdated);

    // Track listeners for cleanup
    listenersRef.current = [
      { event: 'connect', handler: onConnect },
      { event: 'disconnect', handler: onDisconnect },
      { event: 'error', handler: onError },
      { event: 'new_message', handler: onNewMessage },
      { event: 'conversation_updated', handler: onConversationUpdated },
    ];

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup function - remove ALL listeners and disconnect
    return () => {
      console.log('[Chat] Cleaning up socket listeners');
      if (socketRef.current) {
        listenersRef.current.forEach(({ event, handler }) => {
          socketRef.current?.off(event, handler as any);
        });
        listenersRef.current = [];
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]); // Only depend on user, NOT activeConversation

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await apiClient.get('/chat');
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);
    } catch (error) {
      console.error('[Chat] Failed to load conversations', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && socketRef.current) {
      socketRef.current.emit('join_conversation', activeConversation.id);
      
      const fetchMessages = async () => {
        try {
          const res = await apiClient.get(`/chat/${activeConversation.id}/messages`);
          setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
          console.error('[Chat] Failed to load messages', error);
          setMessages([]);
        }
      };
      
      fetchMessages();


      return () => {
        socket.emit('leave_conversation', activeConversation.id);
      };
    }
  }, [activeConversation, socket]);

  const sendMessage = async (content: string, type: 'text' | 'image' | 'video' = 'text') => {
    if (!activeConversation) return;

    try {
      await apiClient.post(`/chat/${activeConversation.id}/messages`, { content, type });
      // Message will be received via socket 'new_message' event
    } catch (error) {
      console.error('Failed to send message', error);
      throw error;
    }
  };

  const initConversation = async (targetUserId: string) => {
    try {
      const res = await apiClient.post('/chat/init', { targetUserId });
      const conversation = res.data;
      if (!conversation) {
        console.warn('Init conversation returned no data', res.error);
        return;
      }
      
      // Check if conversation already exists in list
      const exists = Array.isArray(conversations) ? conversations.find(c => c.id === conversation.id) : undefined;
      if (!exists) {
        setConversations(prev => [conversation, ...(Array.isArray(prev) ? prev : [])]);
      }
      
      setActiveConversation(conversation);
    } catch (error) {
      console.error('Failed to init conversation', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider value={{
      socket,
      conversations,
      activeConversation,
      messages,
      setActiveConversation,
      sendMessage,
      initConversation,
      loadConversations,
      isConnected
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
