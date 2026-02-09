import React, { useState, useRef, KeyboardEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { CameraIcon } from '../../../components/ui/icons';

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
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiSet = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😍', '🤔', '👏', '💯', '🚀', '⭐'];

  const handleSend = async () => {
    // Allow send if either has content OR has an image
    if ((!content.trim() && !imageUrl) || isSending) return;

    setSendError(null);
    try {
      console.log('🎯 MessageInput.handleSend called with:', {
        hasContent: content.trim().length > 0,
        hasImage: !!imageUrl,
        content: content.substring(0, 50)
      });
      
      await onSend(content.trim(), imageUrl || undefined);
      setContent('');
      setImageUrl(null);
      setShowEmojiPicker(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Keep focus on input for next message
        textareaRef.current.focus();
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Erro ao enviar mensagem';
      console.error('❌ MessageInput send error:', {
        message: errorMsg,
        error,
      });
      setSendError(errorMsg);
      // Auto-clear error after 5 seconds
      setTimeout(() => setSendError(null), 5000);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
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
    <div className="message-input-wrapper">
      {sendError && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '4px',
          color: '#ff6b6b',
          fontSize: '12px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>❌ {sendError}</span>
          <button
            onClick={() => setSendError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        </div>
      )}
      {imageUrl && (
        <div className="image-preview-container">
          <img src={imageUrl} alt="Preview" className="image-preview-img" />
          <button
            onClick={() => setImageUrl(null)}
            className="image-preview-remove"
            type="button"
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      )}

      <div className="message-input-container">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('messageInputPlaceholder')}
          rows={1}
          disabled={isSending}
          className="message-textarea"
        />
        
        <div className="message-controls">
          {/* Emoji Button */}
          <div className="control-group emoji-group">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSending}
              className="control-button emoji-button"
              title="Add emoji"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="emoji-picker-popup">
                <div className="emoji-picker-grid">
                  {emojiSet.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="emoji-button-item"
                      type="button"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Image Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="control-button image-button"
            title="Upload image"
            type="button"
          >
            <CameraIcon className="control-icon" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            aria-label="Upload image file"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !imageUrl) || isSending}
            className="control-button send-button"
            type="button"
            title={t('send')}
          >
            {isSending ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="5" r="1" />
                <circle cx="5" cy="19" r="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
