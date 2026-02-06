import React from 'react';
import { useFloatingChat } from '../contexts/FloatingChatContext';
import { FloatingChatWindow } from './FloatingChatWindow';
import { initConversation } from '../features/messaging/api/messagingApi';
import { baseClient } from '../api/client';
import { useState, useEffect } from 'react';
import { User } from '../types';

interface ConversationData {
  id: number | string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface FloatingChatContainerProps {
  currentUser: User | null;
}

export const FloatingChatContainer: React.FC<FloatingChatContainerProps> = ({ currentUser }) => {
  const { openChats, closeChat } = useFloatingChat();
  const [conversations, setConversations] = useState<{ [key: string]: ConversationData }>({});
  const [isAuthenticated, setIsAuthenticated] = useState(!!baseClient.getToken());

  // Verificar se está autenticado
  useEffect(() => {
    const token = baseClient.getToken();
    setIsAuthenticated(!!token);
  }, [openChats]);

  // Debug: Log quando chats abrem
  useEffect(() => {
    if (openChats.length > 0) {
      console.log('📱 FloatingChatContainer - openChats:', openChats);
      console.log('📱 Token present:', !!baseClient.getToken());
    }
  }, [openChats]);

  // Ao abrir um chat, busca ou cria a conversa
  useEffect(() => {
    const loadConversations = async () => {
      if (!isAuthenticated) {
        console.warn('⚠️  Não autenticado, ignorando abertura de chat');
        return;
      }

      const newConversations: { [key: string]: ConversationData } = { ...conversations };
      for (const chat of openChats) {
        const key = String(chat.userId);
        if (!conversations[key]) {
          try {
            console.log('📱 Iniciando conversa com userId:', chat.userId);
            const conversation = await initConversation(chat.userId);
            console.log('✅ Conversa inicializada:', conversation);
            if (conversation?.id) {
              newConversations[key] = conversation as ConversationData;
            } else {
              console.error('❌ Resposta não tem ID:', conversation);
            }
          } catch (err: any) {
            console.error('❌ Erro ao inicializar conversa:', err);
            console.error('Status:', err?.status);
            console.error('Mensagem:', err?.message);
          }
        }
      }
      setConversations(newConversations);
    };

    if (openChats.length > 0 && isAuthenticated) {
      loadConversations();
    }
  }, [openChats, isAuthenticated]);

  return (
    <div className="floating-chats-container">
      {openChats.map((chat) => {
        const conversationData = conversations[String(chat.userId)];
        if (!conversationData) return null;

        return (
          <FloatingChatWindow
            key={chat.userId}
            conversationId={conversationData.id}
            otherUser={conversationData.otherUser}
            currentUserId={currentUser?.id}
            onClose={() => closeChat(chat.userId)}
          />
        );
      })}
    </div>
  );
};
