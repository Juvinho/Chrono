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
  const { messages, isLoading, error, refetch } = useMessages(conversationId);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Marcar como lido ao abrir
  useEffect(() => {
    markAsRead(conversationId).catch(() => {
      // Falha silenciosa
    });
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId,
        content: messageText.trim(),
      });
      setMessageText('');
      await refetch();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsSending(false);
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
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`floating-chat-message ${isMine ? 'mine' : 'theirs'}`}
                >
                  <div className="floating-message-content">{msg.content}</div>
                  <div className="floating-message-time">
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
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
              className="floating-chat-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escreva uma mensagem..."
              disabled={isSending}
            />
            <button
              className="floating-chat-send"
              onClick={handleSendMessage}
              disabled={isSending || !messageText.trim()}
            >
              {isSending ? '...' : '→'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
