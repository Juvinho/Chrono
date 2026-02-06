import React, { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isSending: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  isSending,
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    try {
      await onSend(content);
      setContent('');
      
      // Reset altura do textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Falha ao enviar mensagem. Tente novamente.');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sem Shift = enviar
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Shift+Enter = nova linha (comportamento padrão)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Escreva uma mensagem..."
        rows={1}
        disabled={isSending}
        className="message-input-field"
      />
      
      <button
        onClick={handleSend}
        disabled={!content.trim() || isSending}
        className="message-send-button"
        aria-label="Enviar mensagem"
        title="Pressione Enter para enviar"
      >
        {isSending ? (
          <span>⏳</span>
        ) : (
          <SendIcon />
        )}
      </button>
    </div>
  );
};

const SendIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
