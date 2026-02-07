import React from 'react';
import { MessagingLayout } from './MessagingLayout';
import '../styles/messaging.css';

export const MessagesSplitView: React.FC = () => {
  return (
    <div className="messages-full-view">
      <MessagingLayout />
    </div>
  );
};
