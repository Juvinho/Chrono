import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Message } from '../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { ImageViewer } from '../../../components/ImageViewer';

interface MessageListProps {
  messages: Message[];
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return 'Hoje';
  if (msgDay.getTime() === yesterday.getTime()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();

  if (!currentUser) {
    return (
      <div className="messages-empty">
        <p>{t('errorUnauthenticatedUser') || 'Erro: Usuário não autenticado'}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <p>{t('noMessagesYet') || 'Nenhuma mensagem ainda. Envie a primeira!'}</p>
      </div>
    );
  }

  // Build enriched message list with grouping + date separators
  const items = useMemo(() => {
    type Item =
      | { kind: 'separator'; label: string; key: string }
      | { kind: 'message'; message: Message; isMine: boolean; isFirst: boolean; isLast: boolean };

    const result: Item[] = [];
    let lastDayKey = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const sentAt = new Date(msg.sentAt);
      const dayKey = `${sentAt.getFullYear()}-${sentAt.getMonth()}-${sentAt.getDate()}`;

      if (dayKey !== lastDayKey) {
        result.push({ kind: 'separator', label: formatDateSeparator(sentAt), key: `sep-${dayKey}` });
        lastDayKey = dayKey;
      }

      const isMine = String(msg.sender.id) === String(currentUser.id);
      const prevMsg = messages[i - 1];
      const nextMsg = messages[i + 1];

      const isFirst =
        !prevMsg ||
        String(prevMsg.sender.id) !== String(msg.sender.id) ||
        new Date(msg.sentAt).getTime() - new Date(prevMsg.sentAt).getTime() > 5 * 60 * 1000;

      const isLast =
        !nextMsg ||
        String(nextMsg.sender.id) !== String(msg.sender.id) ||
        new Date(nextMsg.sentAt).getTime() - new Date(msg.sentAt).getTime() > 5 * 60 * 1000;

      result.push({ kind: 'message', message: msg, isMine, isFirst, isLast });
    }

    return result;
  }, [messages, currentUser.id]);

  return (
    <div className="message-list">
      {items.map((item) => {
        if (item.kind === 'separator') {
          return (
            <div key={item.key} className="message-date-separator">
              <span>{item.label}</span>
            </div>
          );
        }
        return (
          <MessageBubble
            key={item.message.id}
            message={item.message}
            isMine={item.isMine}
            isFirst={item.isFirst}
            isLast={item.isLast}
          />
        );
      })}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isFirst: boolean;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, isFirst, isLast }) => {
  const [showImageViewer, setShowImageViewer] = useState(false);

  const bubbleClass = [
    'message-bubble',
    isMine ? 'mine' : 'theirs',
    isFirst ? 'first' : '',
    isLast ? 'last' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Render message row with correct avatar positioning
  const renderMessageRow = () => {
    if (isMine) {
      // Sent by current user: [empty space] [balão] [avatar direita]
      return (
        <div className="message-row message-row--own">
          {/* Bubble centered */}
          <div className={bubbleClass}>
            {/* Image if present */}
            {message.imageUrl && (
              <div style={{ marginBottom: message.content ? '6px' : 0 }}>
                <img
                  src={message.imageUrl}
                  alt="Message attachment"
                  width={200}
                  height={200}
                  onClick={() => setShowImageViewer(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '250px',
                    borderRadius: '12px',
                    display: 'block',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                />
              </div>
            )}

            {/* Text content */}
            {message.content && (
              <div className="message-content">{message.content}</div>
            )}

            {/* Meta info (timestamp and read status) */}
            <div className="message-meta">
              <span className="message-time">{formatTime(message.sentAt)}</span>
              <span className={`read-tick ${message.isRead ? 'read' : 'unread'}`}>
                {message.isRead ? '✓✓' : '✓'}
              </span>
            </div>
          </div>

          {/* Avatar on the right */}
          {isLast && (
            <div className="message-avatar">
              {message.sender.avatarUrl ? (
                <img src={message.sender.avatarUrl} alt={message.sender.username} />
              ) : (
                <div className="avatar-placeholder-small">
                  {message.sender.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
          )}
          {!isLast && <div className="message-avatar-placeholder" />}
        </div>
      );
    } else {
      // Received from other user: [avatar esquerda] [balão] [empty space]
      return (
        <div className="message-row message-row--other">
          {/* Avatar on the left */}
          {isLast && (
            <div className="message-avatar">
              {message.sender.avatarUrl ? (
                <img src={message.sender.avatarUrl} alt={message.sender.username} />
              ) : (
                <div className="avatar-placeholder-small">
                  {message.sender.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
          )}
          {!isLast && <div className="message-avatar-placeholder" />}

          {/* Bubble centered */}
          <div className={bubbleClass}>
            {/* Image if present */}
            {message.imageUrl && (
              <div style={{ marginBottom: message.content ? '6px' : 0 }}>
                <img
                  src={message.imageUrl}
                  alt="Message attachment"
                  width={200}
                  height={200}
                  onClick={() => setShowImageViewer(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '250px',
                    borderRadius: '12px',
                    display: 'block',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                />
              </div>
            )}

            {/* Text content */}
            {message.content && (
              <div className="message-content">{message.content}</div>
            )}

            {/* Meta info (timestamp and read status) */}
            <div className="message-meta">
              <span className="message-time">{formatTime(message.sentAt)}</span>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      {renderMessageRow()}

      {/* Image viewer modal */}
      {message.imageUrl && (
        <ImageViewer
          isOpen={showImageViewer}
          imageUrl={message.imageUrl}
          onClose={() => setShowImageViewer(false)}
          alt="Message image"
        />
      )}
    </>
  );
};
