import React, { useState, useRef, KeyboardEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { PaperClipIcon, SmileIcon } from '../../../components/ui/icons';

interface MessageInputProps {
  onSend: (content: string, imageUrl?: string) => Promise<void>;
  isSending: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  isSending,
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiSet = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😍', '🤔', '👏', '💯', '🚀', '⭐'];

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    try {
      await onSend(content, imageUrl || undefined);
      setContent('');
      setImageUrl(null);
      
      // Reset altura do textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error(t('messageErrorOnSend'), error);
      alert(t('messageSendErrorRetry'));
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent(content + emoji);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="message-input">
      {imageUrl && (
        <div className="image-preview" style={{ marginBottom: '8px', position: 'relative' }}>
          <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }} />
          <button
            onClick={() => setImageUrl(null)}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="emoji-picker" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          marginBottom: '8px',
          padding: '8px',
          background: '#f0f0f0',
          borderRadius: '4px',
        }}>
          {emojiSet.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              style={{
                background: 'white',
                border: 'none',
                padding: '8px',
                fontSize: '20px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'white';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('messageInputPlaceholder')}
          rows={1}
          disabled={isSending}
          className="message-input-field"
          style={{ flex: 1 }}
        />
        
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isSending}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
          }}
          title="Emoji"
        >
          😊
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
          }}
          title="Imagem"
        >
          🖼️
        </button>

        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="message-send-button"
          aria-label={t('send')}
          title={t('sendButtonTitle')}
        >
          {isSending ? (
            <span>⏳</span>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
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
