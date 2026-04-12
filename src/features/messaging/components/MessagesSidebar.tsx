import { useState, useEffect, useMemo } from 'react';
import { useMessagesSidebar } from '../../../contexts/MessagesSidebarContext';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';
import { CloseIcon, ChevronLeftIcon, SearchIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { useConversations } from '../hooks/useConversations';
import { useAuth } from '../../../contexts/AuthContext';
import '../styles/messaging.css';

export function MessagesSidebar() {
  const {
    isOpen,
    closeSidebar,
    selectedConversationId,
    setSelectedConversation,
  } = useMessagesSidebar();

  const { isAuthenticated } = useAuth();
  const { conversations, isLoading, error } = useConversations({ enabled: isOpen && isAuthenticated });
  const { t } = useTranslation();

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key || value.includes('${')) return fallback;
    return value;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [pendingConversationId, setPendingConversationId] = useState<number | string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery('');
    setPendingConversationId(selectedConversationId ?? null);
    setMobileView(selectedConversationId ? 'chat' : 'list');
  }, [isOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) => {
      const displayName = (conversation.otherUser.displayName || '').toLowerCase();
      const username = (conversation.otherUser.username || '').toLowerCase();
      const preview = (conversation.lastMessage?.content || '').toLowerCase();

      return (
        displayName.includes(normalizedQuery) ||
        username.includes(normalizedQuery) ||
        preview.includes(normalizedQuery)
      );
    });
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (!pendingConversationId) return;

    const isStillVisible = filteredConversations.some((conversation) => conversation.id === pendingConversationId);
    if (!isStillVisible) {
      setPendingConversationId(null);
    }
  }, [filteredConversations, pendingConversationId]);

  const handleSelectConversation = (id: number | string) => {
    setPendingConversationId(id);
    setSelectedConversation(id);
    setMobileView('chat');
  };

  const handleOpenConversation = () => {
    if (!pendingConversationId) return;

    setSelectedConversation(pendingConversationId);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const handleCloseWindow = () => {
    closeSidebar();
    setSearchQuery('');
    setPendingConversationId(null);
    setMobileView('list');
  };

  if (!isOpen) return null;

  const canOpenConversation = pendingConversationId !== null;
  const showMobileChatView = mobileView === 'chat' && selectedConversationId;

  return (
    <>
      <aside className="messages-window" role="dialog" aria-modal="false" aria-label={tr('messages', 'Mensagens')}>
        <div className="messages-window-header">
          <div className="messages-window-title-group">
            <h2>{tr('messages', 'Mensagens')}</h2>
            <p>{tr('selectConversationToStart', 'Selecione um usuario e clique em Ver conversa.')}</p>
          </div>

          <button
            onClick={handleCloseWindow}
            className="messages-window-close-btn"
            aria-label={tr('close', 'Fechar mensagens')}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="messages-window-toolbar">
          <label className="messages-window-search">
            <SearchIcon className="w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar conversa..."
              aria-label="Buscar conversa"
            />
          </label>

          <button
            type="button"
            onClick={handleOpenConversation}
            className="messages-window-open-btn"
            disabled={!canOpenConversation}
          >
            {tr('open', 'Ver conversa')}
          </button>
        </div>

        <div className="messages-window-content">
          <div className="messages-window-list-panel">
            <ConversationList
              conversations={filteredConversations}
              isLoading={isLoading}
              error={error}
              selectedId={pendingConversationId}
              onSelect={handleSelectConversation}
            />

            {!isLoading && !error && filteredConversations.length === 0 && searchQuery.trim().length > 0 && (
              <p className="messages-window-empty-search">
                Nenhuma conversa encontrada para "{searchQuery.trim()}".
              </p>
            )}
          </div>

          <div className="messages-window-chat-panel">
            {selectedConversationId ? (
              <ChatArea conversationId={selectedConversationId} />
            ) : (
              <div className="messaging-empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>{tr('yourMessages', 'Suas Mensagens')}</h3>
                <p>{tr('selectConversationToStart', 'Selecione uma conversa para comecar')}</p>
              </div>
            )}
          </div>

          <div className="messages-window-mobile-panel">
            {showMobileChatView ? (
              <>
                <button
                  onClick={handleBackToList}
                  className="messages-window-mobile-back-btn"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>{tr('back', 'Voltar')}</span>
                </button>

                {selectedConversationId && (
                  <div className="messages-window-mobile-chat-body">
                    <ChatArea conversationId={selectedConversationId} />
                  </div>
                )}
              </>
            ) : (
              <div className="messages-window-mobile-list-body">
                <ConversationList
                  conversations={filteredConversations}
                  isLoading={isLoading}
                  error={error}
                  selectedId={pendingConversationId}
                  onSelect={handleSelectConversation}
                />
                {!isLoading && !error && filteredConversations.length === 0 && searchQuery.trim().length > 0 && (
                  <p className="messages-window-empty-search">
                    Nenhuma conversa encontrada para "{searchQuery.trim()}".
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <style>{`
        .messages-window {
          position: fixed;
          --timeline-safe-offset: 96px;
          --header-safe-offset: 74px;
          top: auto;
          right: 20px;
          bottom: calc(var(--timeline-safe-offset) + env(safe-area-inset-bottom, 0px));
          width: min(960px, calc(100vw - 40px));
          height: clamp(420px, 58vh, 620px);
          min-height: 420px;
          max-height: calc(100vh - var(--header-safe-offset) - var(--timeline-safe-offset));
          background: var(--theme-bg-primary);
          border: 1px solid var(--theme-border-primary);
          border-radius: 18px;
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          resize: vertical;
          z-index: 9999;
          animation: messagesWindowPopIn 0.2s ease-out;
        }

        @keyframes messagesWindowPopIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .messages-window-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--theme-border-primary);
          background: var(--theme-bg-primary);
          gap: 12px;
          flex-shrink: 0;
        }

        .messages-window-title-group {
          min-width: 0;
        }

        .messages-window-title-group h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
          color: var(--theme-text-light);
          font-weight: 700;
        }

        .messages-window-title-group p {
          margin: 2px 0 0;
          font-size: 12px;
          color: var(--theme-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .messages-window-close-btn {
          border: none;
          border-radius: 10px;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--theme-bg-secondary);
          color: var(--theme-text-secondary);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .messages-window-close-btn:hover {
          color: var(--theme-text-light);
          background: var(--theme-bg-tertiary);
        }

        .messages-window-toolbar {
          display: flex;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--theme-border-primary);
          background: var(--theme-bg-primary);
          flex-shrink: 0;
        }

        .messages-window-search {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--theme-border-primary);
          background: var(--theme-bg-secondary);
          border-radius: 10px;
          height: 38px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          gap: 8px;
          color: var(--theme-text-secondary);
        }

        .messages-window-search:focus-within {
          border-color: var(--theme-primary);
        }

        .messages-window-search input {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          color: var(--theme-text-light);
          font-size: 14px;
        }

        .messages-window-search input::placeholder {
          color: var(--theme-text-secondary);
        }

        .messages-window-open-btn {
          border: none;
          border-radius: 10px;
          height: 38px;
          padding: 0 14px;
          background: linear-gradient(135deg, var(--theme-primary), #ff4040);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          white-space: nowrap;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .messages-window-open-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .messages-window-open-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .messages-window-content {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .messages-window-list-panel {
          width: 360px;
          min-width: 290px;
          border-right: 1px solid var(--theme-border-primary);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .messages-window-list-panel .conversation-list {
          flex: 1;
          min-height: 0;
        }

        .messages-window-chat-panel {
          flex: 1;
          min-width: 0;
          display: flex;
          min-height: 0;
        }

        .messages-window-chat-panel .chat-area {
          width: 100%;
        }

        .messages-window-chat-panel .messaging-empty-state {
          width: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
        }

        .messages-window-empty-search {
          margin: 0;
          padding: 10px 14px 14px;
          color: var(--theme-text-secondary);
          font-size: 12px;
        }

        .messages-window-mobile-panel {
          display: none;
        }

        .messages-window-mobile-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          border: none;
          border-bottom: 1px solid var(--theme-border-primary);
          background: var(--theme-bg-primary);
          color: var(--theme-text-light);
          font-weight: 600;
          padding: 12px 14px;
        }

        .messages-window-mobile-chat-body,
        .messages-window-mobile-list-body {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .messages-window-mobile-chat-body .chat-area {
          width: 100%;
        }

        @media (max-width: 980px) {
          .messages-window {
            --timeline-safe-offset: 96px;
            --header-safe-offset: 68px;
            width: min(860px, calc(100vw - 24px));
            right: 12px;
            bottom: calc(var(--timeline-safe-offset) + env(safe-area-inset-bottom, 0px));
            height: clamp(400px, 56vh, 580px);
            max-height: calc(100vh - var(--header-safe-offset) - var(--timeline-safe-offset));
          }

          .messages-window-list-panel {
            width: 320px;
          }
        }

        @media (max-width: 768px) {
          .messages-window {
            top: auto;
            right: 8px;
            left: 8px;
            bottom: 8px;
            width: auto;
            min-height: 70vh;
            max-height: calc(100vh - 16px);
            border-radius: 14px;
            resize: none;
          }

          .messages-window-title-group p {
            display: none;
          }

          .messages-window-list-panel,
          .messages-window-chat-panel {
            display: none;
          }

          .messages-window-mobile-panel {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
          }

          .messages-window-toolbar {
            flex-direction: column;
          }

          .messages-window-open-btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .messages-window {
            right: 0;
            left: 0;
            bottom: 0;
            border-radius: 12px 12px 0 0;
            min-height: 78vh;
            max-height: 95vh;
          }
        }
      `}</style>
    </>
  );
}
