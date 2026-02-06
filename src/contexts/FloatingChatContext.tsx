import React, { createContext, useContext, useState, useCallback } from 'react';

export interface OpenChat {
  userId: number | string;
  username: string;
  avatar?: string;
}

interface FloatingChatContextType {
  openChats: OpenChat[];
  openChat: (userId: number | string, username: string, avatar?: string) => void;
  closeChat: (userId: number | string) => void;
  isOpen: (userId: number | string) => boolean;
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(undefined);

export const FloatingChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const openChat = useCallback((userId: number | string, username: string, avatar?: string) => {
    setOpenChats((prev) => {
      // Se já está aberto, não adiciona novamente
      if (prev.some((chat) => chat.userId === userId)) {
        return prev;
      }
      return [...prev, { userId, username, avatar }];
    });
  }, []);

  const closeChat = useCallback((userId: number | string) => {
    setOpenChats((prev) => prev.filter((chat) => chat.userId !== userId));
  }, []);

  const isOpen = useCallback(
    (userId: number | string) => openChats.some((chat) => chat.userId === userId),
    [openChats]
  );

  return (
    <FloatingChatContext.Provider value={{ openChats, openChat, closeChat, isOpen }}>
      {children}
    </FloatingChatContext.Provider>
  );
};

export const useFloatingChat = () => {
  const context = useContext(FloatingChatContext);
  if (!context) {
    throw new Error('useFloatingChat must be used within FloatingChatProvider');
  }
  return context;
};
