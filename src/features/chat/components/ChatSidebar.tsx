import React from 'react';
import { useChat } from '../ChatContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ChatSidebar: React.FC = () => {
  const { conversations, activeConversation, setActiveConversation } = useChat();

  return (
    <div className="w-full md:w-80 border-r border-[var(--theme-border)] bg-[var(--theme-bg-primary)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--theme-border)]">
        <h2 className="text-xl font-bold text-[var(--theme-text-primary)]">Mensagens</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {(!Array.isArray(conversations) || conversations.length === 0) ? (
          <div className="p-4 text-center text-[var(--theme-text-secondary)]">
            Nenhuma conversa iniciada
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv)}
              className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--theme-bg-tertiary)] transition-colors ${
                activeConversation?.id === conv.id ? 'bg-[var(--theme-bg-tertiary)]' : ''
              }`}
            >
              <img 
                src={conv.other_avatar || 'https://via.placeholder.com/40'} 
                alt={conv.other_username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-[var(--theme-text-primary)] truncate">
                    {conv.other_username}
                  </h3>
                  {conv.updated_at && (
                    <span className="text-xs text-[var(--theme-text-secondary)]">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false, locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--theme-text-secondary)] truncate">
                  {conv.last_message_content || 'Iniciar conversa'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
