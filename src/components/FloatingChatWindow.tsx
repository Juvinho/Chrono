import React, { useState, useEffect } from 'react';
import { useMessages } from '../features/messaging/hooks/useMessages';
import { sendMessage, markAsRead } from '../features/messaging/api/messagingApi';
import { Message } from '../features/messaging/types';
import '../features/messaging/styles/floating-chat.css';

interface OtherUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface FloatingChatWindowProps {
  conversationId: number | string;
  otherUser: OtherUser;
  currentUserId?: string;
  onClose: () => void;
}

export const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({
  conversationId,
  otherUser,
  currentUserId,
  onClose,
}) => {
  const { messages, isLoading, isSending: isSendingMessage, error, sendMessage } = useMessages(conversationId);
  const [messageText, setMessageText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Marcar como lido ao abrir
  useEffect(() => {
    if (conversationId) {
      markAsRead(conversationId).catch((err) => {
        console.warn('Failed to mark as read:', err);
        // Não mostrar erro, é não-crítico
      });
    }
  }, [conversationId]);

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    
    if (!trimmed) {
      alert('Por favor, escreva uma mensagem');
      return;
    }
    
    if (trimmed.length > 1000) {
      alert('Mensagem não pode exceder 1000 caracteres');
      return;
    }

    try {
      await sendMessage(trimmed);
      setMessageText('');
      // Refocus textarea for next message
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert(`Erro ao enviar: ${err instanceof Error ? err.message : 'Tente novamente'}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`floating-chat-window ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="floating-chat-header">
        <div className="floating-chat-header-info">
          <div className="floating-chat-avatar">
            {otherUser.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt={otherUser.displayName} />
            ) : (
              <div className="avatar-placeholder">{getInitials(otherUser.displayName)}</div>
            )}
          </div>
          <div className="floating-chat-name">{otherUser.displayName}</div>
        </div>
        <div className="floating-chat-actions">
          <button
            className="floating-chat-minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button className="floating-chat-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
      </div>

      {/* Chat Area - Hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="floating-chat-messages">
            {isLoading && <div className="floating-chat-loading">Carregando...</div>}
            {error && <div className="floating-chat-error">Erro ao carregar mensagens</div>}
            {!isLoading && messages.length === 0 && (
              <div className="floating-chat-empty">Nenhuma mensagem ainda. Comece a conversa!</div>
            )}
            {messages.map((msg: Message) => {
              const isMine = msg.sender.id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`floating-chat-message ${isMine ? 'mine' : 'theirs'}`}
                >
                  <div className="floating-message-content">{msg.content}</div>
                  <div className="floating-message-time">
                    {new Date(msg.sentAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="floating-chat-input-container">
            <textarea
              ref={textareaRef}
              className="floating-chat-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escreva uma mensagem..."
              disabled={isSendingMessage}
            />
            <button
              className="floating-chat-send"
              onClick={handleSendMessage}
              disabled={isSendingMessage || !messageText.trim()}
            >
              {isSendingMessage ? '...' : '→'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
