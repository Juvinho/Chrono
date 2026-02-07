import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface MessageNotificationContextType {
  unreadCount: number;
  hasNewMessage: boolean;
  isPageVisible: boolean;
  incrementUnread: () => void;
  decrementUnread: (n?: number) => void;
  resetUnread: () => void;
}

const MessageNotificationContext = createContext<MessageNotificationContextType | undefined>(undefined);

export const MessageNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Detectar visibilidade da página (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Atualizar title da página com contador
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `💬 (${unreadCount}) Chrono - Temporal Social Network`;
      setHasNewMessage(true);
    } else {
      document.title = 'Chrono - Temporal Social Network';
      setHasNewMessage(false);
    }
  }, [unreadCount]);

  const incrementUnread = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const decrementUnread = useCallback((n: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - n));
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const contextValue = React.useMemo(
    () => ({
      unreadCount,
      hasNewMessage,
      isPageVisible,
      incrementUnread,
      decrementUnread,
      resetUnread,
    }),
    [unreadCount, hasNewMessage, isPageVisible, incrementUnread, decrementUnread, resetUnread]
  );

  return (
    <MessageNotificationContext.Provider value={contextValue}>
      {children}
    </MessageNotificationContext.Provider>
  );
};

export const useMessageNotification = () => {
  const context = useContext(MessageNotificationContext);
  if (context === undefined) {
    throw new Error('useMessageNotification must be used within a MessageNotificationProvider');
  }
  return context;
};
