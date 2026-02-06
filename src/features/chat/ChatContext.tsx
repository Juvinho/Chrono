import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Socket
  useEffect(() => {
    if (!user) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('new_message', (message: Message) => {
      if (activeConversation && message.conversation_id === activeConversation.id) {
        setMessages((prev) => [...prev, message]);
      }
      // Update last message in conversation list
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
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, activeConversation]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await apiClient.get('/chat/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && socket) {
      socket.emit('join_conversation', activeConversation.id);
      
      const fetchMessages = async () => {
        try {
          const res = await apiClient.get(`/chat/${activeConversation.id}/messages`);
          setMessages(res.data);
        } catch (error) {
          console.error('Failed to load messages', error);
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
      
      // Check if conversation already exists in list
      const exists = conversations.find(c => c.id === conversation.id);
      if (!exists) {
        setConversations(prev => [conversation, ...prev]);
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
