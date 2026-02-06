import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../../components/ui/Header';
import { User, Conversation, Page } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { apiClient } from '../../../api';

interface MessagesPageProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (page: any, data?: string) => void;
  onNotificationClick: (notification: any) => void;
  onViewNotifications: () => void;
  allUsers: User[];
  conversations: Conversation[];
  lastViewedNotifications?: Date | null;
}

export default function MessagesPage({
  currentUser,
  onLogout,
  onNavigate,
  onNotificationClick,
  onViewNotifications,
  allUsers,
  conversations,
  lastViewedNotifications
}: MessagesPageProps) {
  const { t } = useTranslation();
  const { username: presetUsername } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [es, setEs] = useState<EventSource | null>(null);
  const [peerStatus, setPeerStatus] = useState<{ username?: string; online?: boolean; lastSeen?: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await apiClient.getConversations();
      if (!mounted) return;
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setInbox(res.data || []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const initByUsername = async () => {
      if (!presetUsername) return;
      const conv = await apiClient.getOrCreateConversation(presetUsername);
      if (conv.data?.id || conv.data?.conversationId) {
        const id = conv.data.id || conv.data.conversationId;
        setActiveConversationId(id);
        const msgs = await apiClient.getMessages(id, { limit: 50 });
        setMessages(msgs.data || []);
        try {
          await apiClient.markConversationAsRead(id);
        } catch {}
        const status = await apiClient.getUserStatus(presetUsername);
        setPeerStatus(status.data || null);
        const stream = apiClient.subscribeConversation(id, {
          onMessages: (msgs) => {
            if (!mounted) return;
            setMessages(prev => [...prev, ...msgs]);
            try {
              const last = msgs[msgs.length - 1];
              if (last?.id) {
                apiClient.updateMessageStatus(id, last.id, 'delivered').catch(() => {});
                apiClient.updateMessageStatus(id, last.id, 'read').catch(() => {});
              }
            } catch {}
          },
          onTyping: (data) => {
            if (!mounted) return;
            setTypingUsers(data.users || []);
          }
        });
        setEs(stream);
      }
    };
    initByUsername();
    return () => { 
      mounted = false; 
      es?.close();
    };
  }, [presetUsername]);

  const handleOpenConversation = async (id: string) => {
    setActiveConversationId(id);
    const msgs = await apiClient.getMessages(id, { limit: 50 });
    setMessages(msgs.data || []);
    try {
      await apiClient.markConversationAsRead(id);
    } catch {}
    const stream = apiClient.subscribeConversation(id, {
      onMessages: (newMsgs) => {
        setMessages(prev => [...prev, ...newMsgs]);
        try {
          const last = newMsgs[newMsgs.length - 1];
          if (last?.id) {
            apiClient.updateMessageStatus(id, last.id, 'delivered').catch(() => {});
            apiClient.updateMessageStatus(id, last.id, 'read').catch(() => {});
          }
        } catch {}
      },
      onTyping: (data) => setTypingUsers(data.users || [])
    });
    es?.close();
    setEs(stream);
  };
  
  const loadOlder = async () => {
    if (!activeConversationId || messages.length === 0) return;
    const oldest = messages[0]?.created_at;
    const res = await apiClient.getMessages(activeConversationId, { before: oldest, limit: 50 });
    const older = res.data || [];
    if (older.length === 0) {
      setHasMore(false);
    } else {
      setMessages(prev => [...older, ...prev]);
    }
  };

  const handleSend = async () => {
    if (!activeConversationId || !input.trim()) return;
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUser.id,
      text: input,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    const res = await apiClient.sendMessage(activeConversationId, optimistic.text);
    if (res.error) {
      setError(res.error);
      // simple rollback: remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      return;
    }
    const real = res.data!;
    setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
    try {
      await apiClient.updateMessageStatus(activeConversationId, real.id, 'delivered');
      await apiClient.updateMessageStatus(activeConversationId, real.id, 'read');
    } catch {}
  };
  
  const handleTyping = async (value: string) => {
    setInput(value);
    if (activeConversationId) {
      apiClient.sendTyping(activeConversationId);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
      <Header 
        user={currentUser} 
        onLogout={onLogout} 
        onViewProfile={(u: string) => onNavigate(Page.Profile, u)} 
        onNavigate={onNavigate} 
        onNotificationClick={onNotificationClick} 
        onViewNotifications={onViewNotifications} 
        onSearch={() => {}} 
        onOpenMarketplace={() => onNavigate(1, 'marketplace')} 
        allUsers={allUsers} 
        allPosts={[]} 
        conversations={conversations} 
        lastViewedNotifications={lastViewedNotifications}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
          <h2 className="font-bold mb-3">{t('inbox') || 'Inbox'}</h2>
          {loading ? (
            <div>{t('loading') || 'Loading...'}</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <ul className="space-y-2">
              {(inbox || []).map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => handleOpenConversation(item.id)}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-[var(--theme-bg-tertiary)] ${activeConversationId === item.id ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}
                  >
                    <div className="text-sm">
                      <span className="text-[var(--theme-text-light)]">{item.other_username ? `@${item.other_username}` : `#${item.id.substring(0, 6)}`}</span>
                      <span className="ml-2 text-[var(--theme-text-secondary)]">{new Date(item.updated_at || item.last_message_at || item.created_at).toLocaleString()}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
          {activeConversationId ? (
            <>
              <div className="space-y-3 mb-4">
                {hasMore && (
                  <button onClick={loadOlder} className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]">
                    {t('loadOlder') || 'Carregar mais'}
                  </button>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className="p-2 rounded border border-[var(--theme-border-primary)]">
                    <div className="text-xs text-[var(--theme-text-secondary)] mb-1">
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <span className={msg.sender_id === currentUser.id ? 'text-[var(--theme-primary)]' : ''}>
                        {msg.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {peerStatus && (
                <div className="mb-2 text-xs text-[var(--theme-text-secondary)]">
                  @{peerStatus.username} — {peerStatus.online ? (t('online') || 'Online') : (t('offline') || 'Offline')} {peerStatus.lastSeen ? `• ${new Date(peerStatus.lastSeen).toLocaleString()}` : ''}
                </div>
              )}
              {typingUsers.length > 0 && (
                <div className="mb-2 text-xs text-[var(--theme-text-secondary)]">{t('typing') || 'Digitando...'} {typingUsers.join(', ')}</div>
              )}
              <div className="flex gap-2">
                <input 
                  value={input} 
                  onChange={e => handleTyping(e.target.value)} 
                  placeholder={t('typeMessage') || 'Type a message...'} 
                  className="flex-1 px-3 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded"
                />
                <button 
                  onClick={handleSend}
                   className="px-4 py-2 bg-[var(--theme-primary)] text-black rounded hover:opacity-80"
                  disabled={!input.trim() || !activeConversationId}
                >
                  {t('send') || 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-[var(--theme-text-secondary)]">{t('selectConversation') || 'Select a conversation from the inbox'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
