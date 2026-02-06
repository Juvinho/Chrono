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
          let retries = 3;
          let success = false;
          let lastError: any;

          while (retries > 0 && !success) {
            try {
              console.log(`📱 Tentando iniciar conversa com userId: ${chat.userId} (tentativa ${4 - retries}/3)`);
              const conversation = await initConversation(chat.userId);
              console.log('✅ Conversa inicializada:', conversation);
              if (conversation?.id) {
                newConversations[key] = conversation as ConversationData;
                success = true;
              } else {
                throw new Error('Resposta sem ID');
              }
            } catch (err: any) {
              lastError = err;
              retries--;
              if (retries > 0) {
                // Exponential backoff: 500ms, 1s, 2s
                const delay = Math.pow(2, 3 - retries) * 500;
                console.warn(`⚠️  Falha ao inicializar conversa, retry em ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
              }
            }
          }

          if (!success && lastError) {
            console.error(`❌ Erro final ao inicializar conversa com ${chat.userId}:`, lastError.message);
            // Show error message in chat window
            newConversations[key] = {
              id: chat.userId,
              otherUser: {
                id: String(chat.userId),
                username: chat.username || 'Unknown',
                displayName: chat.displayName || 'Unknown User',
                avatarUrl: null,
              },
            };
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
