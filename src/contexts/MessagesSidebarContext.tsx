import { createContext, useContext, useState, ReactNode } from 'react';

interface MessagesSidebarContextType {
  isOpen: boolean;
  selectedConversationId: number | null;
  openSidebar: (conversationId?: number) => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setSelectedConversation: (id: number | null) => void;
}

const MessagesSidebarContext = createContext<MessagesSidebarContextType | undefined>(undefined);

export function MessagesSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const openSidebar = (conversationId?: number) => {
    setIsOpen(true);
    if (conversationId !== undefined) {
      setSelectedConversationId(conversationId);
    }
  };

  const closeSidebar = () => {
    setIsOpen(false);
    // Não limpa selectedConversationId para manter conversa ao reabrir
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const setSelectedConversation = (id: number | null) => {
    setSelectedConversationId(id);
  };

  return (
    <MessagesSidebarContext.Provider
      value={{
        isOpen,
        selectedConversationId,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        setSelectedConversation,
      }}
    >
      {children}
    </MessagesSidebarContext.Provider>
  );
}

export function useMessagesSidebar() {
  const context = useContext(MessagesSidebarContext);
  if (!context) {
    throw new Error('useMessagesSidebar must be used within MessagesSidebarProvider');
  }
  return context;
}
