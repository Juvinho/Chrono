import { useState, useEffect } from 'react';
import { useMessagesSidebar } from '../../../contexts/MessagesSidebarContext';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';
import { CloseIcon, ChevronLeftIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { useConversations } from '../hooks/useConversations';
import '../styles/messaging.css';

export function MessagesSidebar() {
  const { 
    isOpen, 
    closeSidebar, 
    selectedConversationId,
    setSelectedConversation 
  } = useMessagesSidebar();

  const { conversations, isLoading, error } = useConversations();
  const { t } = useTranslation();

  const [showChatArea, setShowChatArea] = useState(false);

  useEffect(() => {
    if (selectedConversationId) {
      setShowChatArea(true);
    }
  }, [selectedConversationId]);

  const handleSelectConversation = (id: number | string) => {
    setSelectedConversation(id);
    setShowChatArea(true);
  };

  const handleBackToList = () => {
    setShowChatArea(false);
    setSelectedConversation(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* OVERLAY */}
      <div 
        className="messages-sidebar-overlay"
        onClick={closeSidebar}
        aria-label="Fechar mensagens"
      />

      {/* PAINEL LATERAL */}
      <aside className={`messages-sidebar-panel ${isOpen ? 'open' : ''}`}>
        {/* HEADER */}
        <div className="messaging-sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{t('messages') || 'Mensagens'}</h2>
            {/* BOTÃO FECHAR */}
            <button 
              onClick={closeSidebar}
              className="close-button"
              aria-label="Fechar mensagens"
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--theme-text-secondary)',
                transition: 'all 0.2s ease',
                borderRadius: '50%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'rotate(90deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* DESKTOP: Lista + Chat */}
          <div className="messages-sidebar-desktop" style={{ width: '100%', height: '100%', display: 'flex' }}>
            {/* Lista */}
            <div style={{ width: '360px', borderRight: '1px solid var(--theme-border-primary)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ConversationList
                conversations={conversations}
                isLoading={isLoading}
                error={error}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            </div>

            {/* Chat */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {selectedConversationId ? (
                <ChatArea conversationId={selectedConversationId} />
              ) : (
                <div className="messaging-empty-state">
                  <div className="empty-state-icon">💬</div>
                  <h3>{t('yourMessages') || 'Suas Mensagens'}</h3>
                  <p>{t('selectConversationToStart') || 'Selecione uma conversa para começar'}</p>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE: Lista OU Chat */}
          <div className="messages-sidebar-mobile" style={{ width: '100%', height: '100%', display: 'none', flexDirection: 'column' }}>
            {!showChatArea ? (
              <ConversationList
                conversations={conversations}
                isLoading={isLoading}
                error={error}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            ) : (
              <>
                <button 
                  onClick={handleBackToList}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--theme-border-primary)',
                    width: '100%',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--theme-text-primary)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span>{t('back') || 'Voltar'}</span>
                </button>

                {selectedConversationId && (
                  <ChatArea conversationId={selectedConversationId} />
                )}
              </>
            )}
          </div>
        </div>
      </aside>

      <style>{`
        .messages-sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          z-index: 9998;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .messages-sidebar-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 50%;
          height: 100vh;
          background: var(--theme-bg-primary);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .messages-sidebar-panel.open {
          transform: translateX(0);
        }

        @media (prefers-color-scheme: dark) {
          .messages-sidebar-panel {
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
          }
        }

        @media (max-width: 1024px) {
          .messages-sidebar-panel {
            width: 60%;
          }
        }

        @media (max-width: 768px) {
          .messages-sidebar-panel {
            width: 100%;
          }

          .messages-sidebar-desktop {
            display: none !important;
          }

          .messages-sidebar-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
