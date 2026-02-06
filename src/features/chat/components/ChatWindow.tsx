import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../ChatContext';
import { useAuth } from '../../../context/AuthContext';
import { PaperPlaneIcon, ImageIcon } from '@radix-ui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ChatWindow: React.FC = () => {
  const { activeConversation, messages, sendMessage, user } = useChat(); // Assuming user is available in context or passed down
  const { user: currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-secondary)]">
        <p className="text-xl">Selecione uma conversa para começar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--theme-border)] flex items-center gap-3">
        <img 
          src={activeConversation.other_avatar || 'https://via.placeholder.com/40'} 
          alt={activeConversation.other_username}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <h3 className="font-semibold text-[var(--theme-text-primary)]">
            {activeConversation.other_username}
          </h3>
          <span className="text-xs text-[var(--theme-text-secondary)]">
            Online agora
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[70%] p-3 rounded-lg ${
                  isMe 
                    ? 'bg-[var(--theme-primary)] text-white rounded-br-none' 
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="text-[10px] opacity-70 block text-right mt-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg-primary)]">
        <div className="flex gap-2 items-end">
          <button 
            type="button"
            className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 bg-[var(--theme-bg-tertiary)] rounded-2xl px-4 py-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="w-full bg-transparent border-none outline-none resize-none text-[var(--theme-text-primary)] max-h-32"
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-[var(--theme-primary)] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperPlaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
