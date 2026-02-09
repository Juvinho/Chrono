import React, { useEffect, useRef } from 'react';
import { useMessages } from '../hooks/useMessages';
import { useConversations } from '../hooks/useConversations';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useTranslation } from '../../../hooks/useTranslation';

interface ChatAreaProps {
  conversationId: number | string;
}

const ChatArea: React.FC<ChatAreaProps> = ({ conversationId }) => {
  const { t } = useTranslation();
  console.log(`📍 ChatArea carregado com conversationId:`, conversationId);
  
  const {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
  } = useMessages(conversationId);
  
  const { conversations } = useConversations();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousLengthRef = useRef<number>(0);

  // Find current conversation
  const currentConversation = conversations.find(c => c.id === conversationId);

  // Auto-scroll only when NEW messages arrive (not on load)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll if new messages arrived, not on initial load
    if (messages.length > previousLengthRef.current) {
      console.log(`📬 New messages: ${previousLengthRef.current} -> ${messages.length}`);
      scrollToBottom();
    }
    previousLengthRef.current = messages.length;
  }, [messages.length]); // Only depend on length change

  if (isLoading) {
    return (
      <div className="chat-area-loading">
        <div className="spinner">{t('loadingMessagesEllipsis')}</div>
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
              <span className="status">{t('online')}</span>
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

export { ChatArea };
