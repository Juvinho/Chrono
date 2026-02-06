import React, { useEffect, useRef } from 'react';
import { useMessages } from '../hooks/useMessages';
import { useConversations } from '../hooks/useConversations';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatAreaProps {
  conversationId: number | string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ conversationId }) => {
  const {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
  } = useMessages(conversationId);
  
  const { conversations } = useConversations();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Encontra a conversa atual para pegar dados do outro usuário
  const currentConversation = conversations.find(c => c.id === conversationId);

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="chat-area-loading">
        <div className="spinner">Carregando mensagens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-area-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="chat-area">
      {/* Header (nome do outro usuário) */}
      <div className="chat-header">
        {currentConversation && (
          <>
            <div className="chat-header-avatar">
              {currentConversation.otherUser.avatarUrl ? (
                <img src={currentConversation.otherUser.avatarUrl} alt="" />
              ) : (
                <div className="avatar-placeholder">
                  {currentConversation.otherUser.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="chat-header-info">
              <h3>{currentConversation.otherUser.displayName}</h3>
              <span className="status">Online</span>
            </div>
          </>
        )}
      </div>

      {/* Lista de mensagens */}
      <div className="chat-messages">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensagem */}
      <div className="chat-input-container">
        <MessageInput
          onSend={sendMessage}
          isSending={isSending}
        />
      </div>
    </div>
  );
};
