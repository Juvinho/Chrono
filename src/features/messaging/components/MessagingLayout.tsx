import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';
import { useConversations } from '../hooks/useConversations';
import { useMessageNotification } from '../../../contexts/MessageNotificationContext';
import { initConversation, reindexConversations } from '../api/messagingApi';
import '../styles/messaging.css';

export const MessagingLayout: React.FC = () => {
  const location = useLocation();
  const { conversations, isLoading, error, refetch } = useConversations();
  const { unreadCount, resetUnread } = useMessageNotification();
  const [selectedConversationId, setSelectedConversationId] = useState<number | string | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);

  console.log('💬 MessagingLayout carregado', {
    selectedConversationId,
    conversationsCount: conversations.length,
    conversations: conversations.map(c => ({ id: c.id, otherUser: c.otherUser.username }))
  });

  // ✅ Limpa contador quando volta avisualizar a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Página ficou visível novamente
        resetUnread();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetUnread]);

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

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const result = await reindexConversations();
      console.log('✅ Conversas reindexadas:', result.diagnostics);
      alert(`✅ Reindex completo!\n\n${JSON.stringify(result.diagnostics, null, 2)}`);
      // Recarrega conversas
      refetch();
    } catch (err: any) {
      console.error('❌ Erro ao reindexar:', err);
      alert('❌ Erro ao reindexar conversas: ' + err.message);
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <div className="messaging-layout">
      {/* SIDEBAR - Lista de conversas */}
      <div className="messaging-sidebar">
        <div className="messaging-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0 }}>Mensagens</h2>
              {unreadCount > 0 && (
                <span 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #00f0ff, #ff00ff)',
                    color: '#000',
                    borderRadius: '50%',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(0, 240, 255, 0.6)'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {error && (
              <button
                onClick={handleReindex}
                disabled={isReindexing}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: isReindexing ? '#666' : '#ff00ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isReindexing ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title={error}
              >
                {isReindexing ? '⏳ Reindexando...' : '🔧 Reindex'}
              </button>
            )}
          </div>
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
