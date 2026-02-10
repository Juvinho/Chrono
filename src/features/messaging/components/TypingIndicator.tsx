import React from 'react';
import '../styles/typing-indicator.css';

interface TypingIndicatorProps {
  username: string;
  show: boolean;
}

/**
 * Typing Indicator Component
 * Shows animated dots while user is typing
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ username, show }) => {
  if (!show) return null;

  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator-content">
        <span className="typing-username">{username} está digitando</span>
        <div className="typing-dots">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    </div>
  );
};
