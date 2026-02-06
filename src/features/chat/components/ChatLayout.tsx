import React, { useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { ChatProvider, useChat } from '../ChatContext';
import { useLocation } from 'react-router-dom';

const ChatLayoutContent: React.FC = () => {
  const { initConversation } = useChat();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { targetUserId?: string } | null;
    if (state?.targetUserId) {
      initConversation(state.targetUserId);
    }
  }, [location.state, initConversation]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--theme-bg-primary)] border rounded-lg border-[var(--theme-border)] m-4 shadow-xl">
      <ChatSidebar />
      <div className="flex-1 hidden md:flex">
        <ChatWindow />
      </div>
    </div>
  );
};

export const ChatLayout: React.FC = () => {
  return (
    <ChatProvider>
      <ChatLayoutContent />
    </ChatProvider>
  );
};
