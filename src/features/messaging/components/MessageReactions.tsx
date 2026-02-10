import React, { useState } from 'react';
import '../styles/message-reactions.css';

interface MessageReactionsProps {
  messageId: string;
  reactions?: Record<string, string[]>; // emoji -> [userIds]
  onAddReaction?: (messageId: string, emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_LIST = ['😀', '😂', '❤️', '😢', '😡', '👍', '👎', '🔥', '✨', '🎉'];

/**
 * Message Reactions Component
 * Allow users to react to messages with emojis
 */
export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions = {},
  onAddReaction,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onAddReaction?.(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="message-reactions-wrapper">
      {/* Display reactions */}
      {Object.entries(reactions).length > 0 && (
        <div className="reactions-display">
          {Object.entries(reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              className="reaction-badge"
              title={`${users.length} pessoas reagiram`}
              onClick={() => handleEmojiClick(emoji)}
            >
              <span className="reaction-emoji">{emoji}</span>
              <span className="reaction-count">{users.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Add reaction button */}
      <div className="add-reaction-container">
        <button
          className="add-reaction-button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={disabled}
          title="Adicionar reação"
        >
          😀
        </button>

        {/* Emoji Picker */}
        {showPicker && (
          <div className="emoji-picker-dropdown">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                className="emoji-picker-item"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
