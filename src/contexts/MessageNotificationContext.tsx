import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface MessageNotificationContextType {
  unreadCount: number;
  hasNewMessage: boolean;
  isPageVisible: boolean;
  incrementUnread: (count?: number) => void;
  decrementUnread: (n?: number) => void;
  resetUnread: () => void;
}

const MessageNotificationContext = createContext<MessageNotificationContextType | undefined>(undefined);

export const MessageNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Solicitar permissão para notificações do browser ao montar
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        console.log('✅ Browser notifications already permitted');
      } else if (Notification.permission === 'default') {
        console.log('📢 Requesting browser notification permission...');
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('✅ Browser notifications permitted');
          }
        });
      }
    }
  }, []);

  // Detectar visibilidade da página (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);

      // Clear stale unread badge/title when user returns to the app.
      if (isVisible) {
        setUnreadCount(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Atualizar title da página com contador
  useEffect(() => {
    if (unreadCount > 0) {
      const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
      document.title = `💬 (${displayCount}) Chrono - Temporal Social Network`;
      setHasNewMessage(true);
      
      // Enviar notificação do browser se permitido
      if ('Notification' in window && Notification.permission === 'granted' && !isPageVisible) {
        try {
          new Notification('Nova Mensagem', {
            body: `Você tem ${unreadCount} mensagens não lidas`,
            icon: 'https://placehold.co/64',
            badge: 'https://placehold.co/64',
            tag: 'chrono-message',
            requireInteraction: false
          });
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      }
    } else {
      document.title = 'Chrono - Temporal Social Network';
      setHasNewMessage(false);
    }
  }, [unreadCount, isPageVisible]);

  const incrementUnread = useCallback((count: number = 1) => {
    setUnreadCount(prev => prev + count);
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
