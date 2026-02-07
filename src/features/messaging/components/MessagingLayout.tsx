import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';
import { useConversations } from '../hooks/useConversations';
import { initConversation } from '../api/messagingApi';
import '../styles/messaging.css';

export const MessagingLayout: React.FC = () => {
  const location = useLocation();
  const { conversations, isLoading, error, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<number | string | null>(null);

  console.log('💬 MessagingLayout carregado', {
    selectedConversationId,
    conversationsCount: conversations.length,
    conversations: conversations.map(c => ({ id: c.id, otherUser: c.otherUser.username }))
  });

  // ✅ Seleciona conversa ao vir de navegação (botão "Enviar Mensagem")
  useEffect(() => {
    const state = location.state as { selectedConversationId?: number | string; targetUserId?: number | string };
    
    console.log('📍 location.state:', state);
    
    if (state?.selectedConversationId) {
      console.log('✅ Selecionando conversa:', state.selectedConversationId);
      setSelectedConversationId(state.selectedConversationId);
    } else if (state?.targetUserId) {
      // Se veio com targetUserId, cria/busca a conversa
      console.log('🔗 Iniciando conversa com:', state.targetUserId);
      initConversation(state.targetUserId)
        .then((conversation) => {
          console.log('✅ Conversa criada/encontrada:', conversation.id);
          setSelectedConversationId(conversation.id);
          refetch();
        })
        .catch((error) => {
          console.error('Erro ao iniciar conversa:', error);
        });
    }
  }, [location.state, refetch]);

  return (
    <div className="messaging-layout">
      {/* SIDEBAR - Lista de conversas */}
      <div className="messaging-sidebar">
        <div className="messaging-sidebar-header">
          <h2>Mensagens</h2>
        </div>
        
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          error={error}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>

      {/* MAIN AREA - Chat */}
      <div className="messaging-main">
        {selectedConversationId ? (
          <ChatArea conversationId={selectedConversationId} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

// Estado vazio (quando nenhuma conversa selecionada)
const EmptyState: React.FC = () => (
  <div className="messaging-empty-state">
    <div className="empty-state-icon">💬</div>
    <h3>Suas Mensagens</h3>
    <p>Selecione uma conversa para começar</p>
  </div>
);
