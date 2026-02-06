import React from 'react';
import { useFloatingChat } from '../contexts/FloatingChatContext';
import { FloatingChatWindow } from './FloatingChatWindow';
import { initConversation } from '../features/messaging/api/messagingApi';
import { useState, useEffect } from 'react';

export const FloatingChatContainer: React.FC = () => {
  const { openChats, closeChat } = useFloatingChat();
  const [conversations, setConversations] = useState<{ [key: string]: number | string }>({});

  // Debug: Log quando chats abrem
  useEffect(() => {
    console.log('📱 FloatingChatContainer - openChats:', openChats);
  }, [openChats]);

  // Ao abrir um chat, busca ou cria a conversa
  useEffect(() => {
    const loadConversations = async () => {
      const newConversations: { [key: string]: number | string } = { ...conversations };
      for (const chat of openChats) {
        const key = String(chat.userId);
        if (!conversations[key]) {
          try {
            console.log('📱 Iniciando conversa com userId:', chat.userId);
            const conversation = await initConversation(chat.userId);
            console.log('✅ Conversa inicializada:', conversation);
            if (conversation?.id) {
              newConversations[key] = conversation.id;
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

    if (openChats.length > 0) {
      loadConversations();
    }
  }, [openChats]);

  return (
    <div className="floating-chats-container">
      {openChats.map((chat) => {
        const conversationId = conversations[String(chat.userId)];
        if (!conversationId) return null;

        return (
          <FloatingChatWindow
            key={chat.userId}
            conversationId={conversationId}
            username={chat.username}
            avatar={chat.avatar}
            onClose={() => closeChat(chat.userId)}
          />
        );
      })}
    </div>
  );
};
