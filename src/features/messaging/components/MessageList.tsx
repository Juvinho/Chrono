import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Message } from '../types';
import { formatMessageTime } from '../utils/formatTimestamp';
import { useTranslation } from '../../../hooks/useTranslation';
import { ImageViewer } from '../../../components/ImageViewer';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  
  // Guard against invalid state
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

  const messageElements = useMemo(() => {
    return messages.map((message) => {
      const isMine = String(message.sender.id) === String(currentUser.id);
      
      return (
        <MessageBubble
          key={message.id}
          message={message}
          isMine={isMine}
        />
      );
    });
  }, [messages, currentUser.id]);

  return (
    <div className="message-list">
      {messageElements}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine }) => {
  const { t } = useTranslation();
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  return (
    <>
      <div className={`message-item ${isMine ? 'mine' : 'theirs'}`}>
        <div className="message-bubble">
          {message.imageUrl && (
            <div style={{ marginBottom: message.content ? '8px' : '0' }}>
              <img
                src={message.imageUrl}
                alt="Message"
                onClick={() => setShowImageViewer(true)}
                style={{
                  maxWidth: '200px',
                  borderRadius: '8px',
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              />
            </div>
          )}
          {message.content && (
            <div className="message-content">
              {message.content}
            </div>
          )}
          <div className="message-time">
            {formatMessageTime(message.sentAt)}
            {isMine && message.isRead && <span className="read-indicator"> · {t('seen')}</span>}
          </div>
        </div>
      </div>
      
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
