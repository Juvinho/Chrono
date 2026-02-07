import React, { create } from 'zustand';
import { FloatingChatBox } from './FloatingChatBox';
import { Conversation } from '../types';

// Store para gerenciar múltiplos chats abertos
interface ChatStore {
  openChats: Conversation[];
  openChat: (conversation: Conversation) => void;
  closeChat: (conversationId: string | number) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  openChats: [],
  
  openChat: (conversation) => set((state) => {
    // Evita duplicatas
    if (state.openChats.find(c => c.id === conversation.id)) {
      return state;
    }
    // Máximo 4 chats abertos simultaneamente
    const newChats = [...state.openChats, conversation].slice(-4);
    return { openChats: newChats };
  }),
  
  closeChat: (conversationId) => set((state) => ({
    openChats: state.openChats.filter(c => c.id !== conversationId)
  })),

  clearAll: () => set({ openChats: [] }),
}));

// Componente que renderiza todos os chats flutuantes
export const FloatingChatManager: React.FC = () => {
  const { openChats, closeChat } = useChatStore();

  return (
    <div className="floating-chat-container">
      {openChats.map((conversation, index) => (
        <div 
          key={conversation.id}
          className="floating-chat-wrapper"
          style={{ 
            '--chat-index': index,
          } as React.CSSProperties}
        >
          <FloatingChatBox
            conversation={conversation}
            onClose={() => closeChat(conversation.id)}
          />
        </div>
      ))}
    </div>
  );
};
