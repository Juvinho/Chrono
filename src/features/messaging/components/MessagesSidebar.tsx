import { useState, useEffect } from 'react';
import { useMessagesSidebar } from '../../../contexts/MessagesSidebarContext';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';
import { CloseIcon, ChevronLeftIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import './messages-sidebar.css';

interface MessagesSidebarProps {
  conversations?: any[];
  isLoading?: boolean;
}

export function MessagesSidebar({ conversations = [], isLoading = false }: MessagesSidebarProps) {
  const { 
    isOpen, 
    closeSidebar, 
    selectedConversationId,
    setSelectedConversation 
  } = useMessagesSidebar();

  const { t } = useTranslation();

  // Estado local para controlar se está mostrando lista ou chat (mobile)
  const [showChatArea, setShowChatArea] = useState(false);

  useEffect(() => {
    // Se tem conversa selecionada, mostra o chat
    if (selectedConversationId) {
      setShowChatArea(true);
    }
  }, [selectedConversationId]);

  const handleSelectConversation = (id: number) => {
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
      {/* OVERLAY (fundo escuro clicável) */}
      <div 
        className="messages-sidebar-overlay"
        onClick={closeSidebar}
        aria-label="Fechar mensagens"
      />

      {/* PAINEL LATERAL */}
      <aside className={`messages-sidebar-panel ${isOpen ? 'open' : ''}`}>
        {/* HEADER DO PAINEL */}
        <div className="messages-sidebar-header">
          <div className="header-title">
            <h2>{t('messages') || 'Mensagens'}</h2>
          </div>

          {/* BOTÃO FECHAR com animação */}
          <button 
            onClick={closeSidebar}
            className="close-button"
            aria-label="Fechar mensagens"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* CONTEÚDO DO PAINEL */}
        <div className="messages-sidebar-content">
          {/* DESKTOP: Mostra lista e chat lado a lado */}
          <div className="messages-desktop-layout">
            {/* Lista de conversas */}
            <div className="conversations-panel">
              <ConversationList
                conversations={conversations}
                isLoading={isLoading}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            </div>

            {/* Área de chat */}
            <div className="chat-panel">
              {selectedConversationId ? (
                <ChatArea conversationId={selectedConversationId} />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* MOBILE: Mostra lista OU chat */}
          <div className="messages-mobile-layout">
            {!showChatArea ? (
              <ConversationList
                conversations={conversations}
                isLoading={isLoading}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            ) : (
              <div className="mobile-chat-container">
                <button 
                  onClick={handleBackToList}
                  className="back-to-list-button"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span>{t('back') || 'Voltar'}</span>
                </button>

                {selectedConversationId && (
                  <ChatArea conversationId={selectedConversationId} />
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="messages-empty-state">
      <div className="empty-icon">💬</div>
      <h3>{t('yourMessages') || 'Suas Mensagens'}</h3>
      <p>{t('selectConversationToStart') || 'Selecione uma conversa para começar'}</p>
    </div>
  );
}
