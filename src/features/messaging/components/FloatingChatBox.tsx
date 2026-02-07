import React, { useState, useEffect, useRef } from 'react';
import { MessageIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '../../../components/ui/icons';
import { useMessages } from '../hooks/useMessages';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useTranslation } from '../../../hooks/useTranslation';
import { Conversation } from '../types';
import '../styles/floating-chat.css';

interface FloatingChatBoxProps {
  conversation: Conversation;
  onClose: () => void;
}

export const FloatingChatBox: React.FC<FloatingChatBoxProps> = ({ conversation, onClose }) => {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const { messages, isLoading, isSending, sendMessage } = useMessages(conversation.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isMinimized]);

  return (
    <div className={`floating-chat-box ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="floating-chat-header">
        <div className="header-user-info">
          <div className="avatar-mini">
            {conversation.otherUser.avatarUrl ? (
              <img 
                src={conversation.otherUser.avatarUrl} 
                alt={conversation.otherUser.displayName} 
                className="avatar-mini-img"
              />
            ) : (
              <div className="avatar-placeholder-mini">
                {conversation.otherUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-name-floating">
            <span className="user-display-name">{conversation.otherUser.displayName}</span>
            <span className="status-dot online"></span>
          </div>
        </div>

        <div className="header-actions">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="icon-btn-floating"
            title={isMinimized ? t('maximize') : t('minimize')}
          >
            {isMinimized ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
          <button 
            onClick={onClose}
            className="icon-btn-floating close-btn"
            title={t('close')}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body (apenas quando não minimizado) */}
      {!isMinimized && (
        <>
          <div className="floating-chat-body">
            {isLoading && messages.length === 0 ? (
              <div className="loading-state">
                <div className="spinner-mini"></div>
                {t('loadingMessagesEllipsis')}
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                {t('noMessagesYet') || 'Nenhuma mensagem ainda. Envie a primeira!'}
              </div>
            ) : (
              <div className="messages-list">
                <MessageList messages={messages} />
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="floating-chat-footer">
            <MessageInput 
              onSend={sendMessage} 
              isSending={isSending}
            />
          </div>
        </>
      )}
    </div>
  );
};
