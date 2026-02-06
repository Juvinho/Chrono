import React from 'react';
import { Message } from '../types';
import { formatMessageTime } from '../utils/formatTimestamp';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  // TODO: Pegar ID do usuário atual do contexto/auth
  const currentUserId = localStorage.getItem('userId') || '1'; // TEMPORÁRIO

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <p>Nenhuma mensagem ainda. Envie a primeira!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const isMine = String(message.sender.id) === String(currentUserId);
        
        return (
          <MessageBubble
            key={message.id}
            message={message}
            isMine={isMine}
          />
        );
      })}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine }) => {
  return (
    <div className={`message-bubble-container ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <div className="message-avatar">
          {message.sender.avatarUrl ? (
            <img src={message.sender.avatarUrl} alt="" />
          ) : (
            <div className="avatar-placeholder-small">
              {message.sender.displayName.charAt(0)}
            </div>
          )}
        </div>
      )}

      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
        <div className="message-content">
          {message.content}
        </div>
        <div className="message-time">
          {formatMessageTime(message.sentAt)}
          {isMine && message.isRead && <span className="read-indicator"> · Visto</span>}
        </div>
      </div>
    </div>
  );
};
