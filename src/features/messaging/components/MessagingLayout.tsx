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
  const [showSidebar, setShowSidebar] = useState(true);
  const [isReindexing, setIsReindexing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);


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
      // SECURITY FIX: Validate that conversation ID exists (C-14: prevent accessing legacy IDs like "900")
      const conversationExists = conversations.some(c => c.id === state.selectedConversationId);
      
      if (conversationExists) {
        console.log('✅ Selecionando conversa:', state.selectedConversationId);
        setSelectedConversationId(state.selectedConversationId);
      } else {
        console.warn('⚠️ Conversa ID não encontrada:', state.selectedConversationId);
        console.warn('📋 Conversas disponíveis:', conversations.map(c => c.id));
        // Seleciona primeira conversa disponível ou null
        const firstConversationId = conversations.length > 0 ? conversations[0].id : null;
        console.log('🔄 Selecionando primeira conversa ou nenhuma:', firstConversationId);
        setSelectedConversationId(firstConversationId);
        setInitError('Conversa não encontrada. Se você tem uma recente, ela aparecerá aqui.');
      }
    } else if (state?.targetUserId) {
      // Se veio com targetUserId, cria/busca a conversa
      console.log('🔗 Iniciando conversa com:', state.targetUserId);
      setInitError(null);
      initConversation(state.targetUserId)
        .then((conversation) => {
          console.log('✅ Conversa criada/encontrada:', conversation.id);
          setSelectedConversationId(conversation.id);
          setInitError(null);
          refetch();
        })
        .catch((error: any) => {
          const errorMsg = error?.message || 'Erro ao abrir chat';
          console.error('❌ Erro ao iniciar conversa:', error);
          console.error('📋 Error details:', {
            message: error?.message,
            status: error?.statusCode,
            response: error?.response,
            stack: error?.stack
          });
          setInitError(errorMsg);
        });
    }
  }, [location.state, conversations, refetch]);

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

  const handleSelectConversation = (id: number | string) => {
    setSelectedConversationId(id);
    // No mobile, ir direto para o chat ocultando a sidebar
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  return (
    <div className="messaging-layout">
      {/* SIDEBAR - visível no desktop sempre; no mobile só quando showSidebar=true */}
      <div className={`messaging-sidebar ${showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
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
          onSelect={handleSelectConversation}
        />
        {initError && (
          <div
            style={{
              padding: '12px',
              margin: '8px',
              background: '#ff1744',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>❌ {initError}</span>
            <button
              onClick={() => setInitError(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* MAIN AREA - visível no desktop sempre; no mobile só quando !showSidebar */}
      <div className={`messaging-main ${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
        {/* Botão "Voltar" — apenas no mobile quando há conversa selecionada */}
        {selectedConversationId && (
          <button
            className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors text-sm flex-shrink-0"
            onClick={() => setShowSidebar(true)}
          >
            ← Voltar para mensagens
          </button>
        )}
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
