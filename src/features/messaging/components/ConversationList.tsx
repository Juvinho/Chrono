import React from 'react';
import { Conversation } from '../types';
import { formatTimestamp } from '../utils/formatTimestamp';
import { useTranslation } from '../../../hooks/useTranslation';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  selectedId: number | string | null;
  onSelect: (id: number | string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  isLoading,
  error,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="conversation-list-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-list-error">
        <p>{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="conversation-list-empty">
        <p>{t('noConversationYet')}</p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === selectedId}
          onClick={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  );
};

// Item individual da lista
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
}) => {
  const { otherUser, lastMessage, unreadCount } = conversation;
  const { t } = useTranslation();

  return (
    <div
      className={`conversation-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="conversation-avatar">
        {otherUser.avatarUrl ? (
          <img src={otherUser.avatarUrl} alt={otherUser.displayName} />
        ) : (
          <div className="avatar-placeholder">
            {otherUser.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {otherUser.isOnline && <div className="online-indicator" />}
      </div>

      {/* Info */}
      <div className="conversation-info">
        <div className="conversation-header">
          <span className="conversation-name">{otherUser.displayName}</span>
          {lastMessage && (
            <span className="conversation-time">
              {formatTimestamp(lastMessage.sentAt)}
            </span>
          )}
        </div>

        <div className="conversation-preview">
          {lastMessage ? (
            <span className={!lastMessage.isRead ? 'unread' : ''}>
              {lastMessage.content.length > 50
                ? `${lastMessage.content.substring(0, 50)}...`
                : lastMessage.content}
            </span>
          ) : (
            <span className="no-messages">{t('startConversation')}</span>
          )}
        </div>
      </div>

      {/* Badge de não lidos */}
      {unreadCount > 0 && (
        <div className="unread-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="spinner">Carregando...</div>
);
