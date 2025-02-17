import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Page, Post, Conversation, Message, Notification } from '../types';
import Header from './Header';
import { useTranslation } from '../hooks/useTranslation';
import { MessageIcon, EditIcon, LockClosedIcon, UploadIcon, CheckCircleIcon } from './icons';
import NewMessageModal from './modals/NewMessageModal';
import FramePreview, { getFrameShape } from './FramePreview';
import Avatar from './Avatar';

interface MessagesPageProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (page: Page, data?: string) => void;
  onNotificationClick: (notification: Notification) => void;
  allUsers: User[];
  allPosts: Post[];
  conversations: Conversation[];
  onSendMessage: (recipientUsername: string, text: string, media?: { imageUrl?: string, videoUrl?: string }) => void;
  onSendGlitchi: (username: string) => void;
  onMarkConversationAsRead: (conversationId: string) => void;
  onCreateOrFindConversation: (recipientUsername: string, options?: { isEncrypted?: boolean, selfDestructTimer?: number }) => Promise<string>;
  onOpenMarketplace?: () => void;
  onBack?: () => void;
}

export default function MessagesPage({ 
  currentUser, onLogout, onNavigate, onNotificationClick, allUsers, allPosts, 
  conversations, onSendMessage, onSendGlitchi, onMarkConversationAsRead, onCreateOrFindConversation, onOpenMarketplace, onBack 
}: MessagesPageProps) {
  const { t } = useTranslation();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [isEncryptedMode, setIsEncryptedMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ imageUrl?: string, videoUrl?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (file.type.startsWith('video/')) {
          setSelectedMedia({ videoUrl: result });
        } else {
          setSelectedMedia({ imageUrl: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime());
  }, [conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId);
  }, [selectedConversationId, conversations]);

  const otherUser = useMemo(() => {
    if (!activeConversation) return null;
    const otherUsername = activeConversation.participants.find(p => p !== currentUser.username);
    return allUsers.find(u => u.username === otherUsername);
  }, [activeConversation, currentUser, allUsers]);

    // Handle focusing on a conversation from a notification or direct link
  useEffect(() => {
    const focusUser = sessionStorage.getItem('chrono_focus_conversation_user');
    if (focusUser) {
      sessionStorage.removeItem('chrono_focus_conversation_user');
      onCreateOrFindConversation(focusUser).then(newConversationId => {
          setSelectedConversationId(newConversationId);
      });
    }
  }, [currentUser.username, onCreateOrFindConversation]);

  // Mark conversation as read whenever it's selected
  useEffect(() => {
    if (selectedConversationId) {
      onMarkConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId, onMarkConversationAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedMedia) || !otherUser) return;
    onSendMessage(otherUser.username, messageText.trim(), selectedMedia || undefined);
    setMessageText('');
    setSelectedMedia(null);
  };

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };

  const ConversationListItem: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
    const otherParticipantUsername = conversation.participants.find(p => p !== currentUser.username);
    const participant = allUsers.find(u => u.username === otherParticipantUsername);
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const unreadCount = conversation.unreadCount?.[currentUser.username] || 0;

    if (!participant) return null; // In case user was deleted

    const avatarShape = participant.equippedFrame ? getFrameShape(participant.equippedFrame.name) : 'rounded-full';

    return (
      <button
        onClick={() => handleSelectConversation(conversation.id)}
        className={`w-full text-left p-3 flex items-center space-x-3 transition-colors ${selectedConversationId === conversation.id ? 'bg-[var(--theme-bg-tertiary)]' : 'hover:bg-[var(--theme-bg-secondary)]'}`}
      >
        <div className={`relative w-12 h-12 flex-shrink-0`}>
             <Avatar src={participant.avatar} username={participant.username} className={`w-full h-full ${avatarShape} object-cover`} />
             {participant.equippedEffect && (
                <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                    <img 
                        src={participant.equippedEffect.imageUrl} 
                        alt="" 
                        className="w-full h-full object-cover animate-pulse-soft"
                    />
                </div>
            )}
            {participant.equippedFrame && (
                <div className="absolute -inset-1 z-20 pointer-events-none">
                    <FramePreview item={participant.equippedFrame} />
                </div>
            )}
        </div>
        <div className="flex-grow overflow-hidden">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[var(--theme-text-light)] truncate">@{participant.username}</p>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">{unreadCount}</span>
            )}
          </div>
          <p className="text-sm text-[var(--theme-text-secondary)] truncate">{lastMessage?.text || '...'}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header
        user={currentUser}
        onLogout={onLogout}
        onViewProfile={(username) => onNavigate(Page.Profile, username)}
        onNavigate={onNavigate}
        onNotificationClick={onNotificationClick}
        onSearch={handleSearch}
        allPosts={allPosts}
        allUsers={allUsers}
        conversations={conversations}
        onOpenMarketplace={onOpenMarketplace}
        onBack={onBack}
      />
      <main className="flex-grow flex border-t-2 border-[var(--theme-border-primary)] overflow-hidden">
        {/* Left Column: Conversation List */}
        <aside className="w-1/3 border-r-2 border-[var(--theme-border-primary)] flex flex-col">
          <div className="p-4 border-b-2 border-[var(--theme-border-primary)] flex justify-between items-center">
            <h1 className="text-xl font-bold text-[var(--theme-text-light)] glitch-effect" data-text={t('directMessagesTitle')}>{t('directMessagesTitle')}</h1>
             <div className="flex space-x-2">
                <button onClick={() => { setIsEncryptedMode(true); setIsNewMessageModalOpen(true); }} className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]" title={t('newEncryptedCord') || 'New Secure Cord'}>
                    <LockClosedIcon className="w-6 h-6" />
                </button>
                <button onClick={() => { setIsEncryptedMode(false); setIsNewMessageModalOpen(true); }} className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]" title={t('newMessageTitle')}>
                    <EditIcon className="w-6 h-6" />
                </button>
             </div>
          </div>
          <div className="flex-grow overflow-y-auto">
            {sortedConversations.map(convo => <ConversationListItem key={convo.id} conversation={convo} />)}
          </div>
        </aside>

        {/* Right Column: Active Chat */}
        <section className="w-2/3 flex flex-col bg-[var(--theme-bg-secondary)]">
          {activeConversation && otherUser ? (
            <>
              <div className="flex items-center justify-between p-3 border-b-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(Page.Profile, otherUser.username)}>
                  <div className="relative w-10 h-10">
                    {(() => {
                        const avatarShape = otherUser.equippedFrame ? getFrameShape(otherUser.equippedFrame.name) : 'rounded-full';
                        return (
                                <>
                                  <Avatar src={otherUser.avatar} username={otherUser.username} className={`w-full h-full ${avatarShape} object-cover`} />
                                  {otherUser.equippedEffect && (
                                  <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                  <img 
                                      src={otherUser.equippedEffect.imageUrl} 
                                      alt="" 
                                      className="w-full h-full object-cover animate-pulse-soft"
                                  />
                                  </div>
                              )}
                              {otherUser.equippedFrame && (
                                  <div className="absolute -inset-1 z-20 pointer-events-none">
                                  <FramePreview item={otherUser.equippedFrame} />
                                  </div>
                              )}
                            </>
                        );
                    })()}
                  </div>
                  <div>
                    <h2 className="font-bold text-[var(--theme-text-light)]">@{otherUser.username}</h2>
                    <p className="text-xs text-[var(--theme-text-secondary)]">{activeConversation.isEncrypted ? 'Criptografado' : 'Online'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSendGlitchi(otherUser.username); }}
                        className="bg-red-900/30 border border-red-500 text-red-500 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white transition-all font-mono text-xs tracking-tighter"
                    >
                        GLITCHI
                    </button>
                    {activeConversation.isEncrypted && <LockClosedIcon className="w-5 h-5 text-[var(--theme-primary)]" />}
                </div>
              </div>
              <div className="flex-grow p-4 overflow-y-auto flex flex-col space-y-4">
                {activeConversation.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderUsername === currentUser.username ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-3 rounded-lg ${msg.senderUsername === currentUser.username ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'}`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Message media" className="max-w-full rounded-sm mb-2 border border-white/20" />
                      )}
                      {msg.videoUrl && (
                        <video src={msg.videoUrl} controls className="max-w-full rounded-sm mb-2 bg-black" />
                      )}
                      <p className="text-sm">{msg.text}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-[10px] ${msg.senderUsername === currentUser.username ? 'text-white/70' : 'text-[var(--theme-text-secondary)]'}`}>{msg.timestamp.toLocaleTimeString()}</p>
                        {msg.senderUsername === currentUser.username && (
                            <div className="flex items-center ml-2">
                                {msg.status === 'read' ? (
                                    <CheckCircleIcon className="w-3 h-3 text-emerald-400" title="Lida" />
                                ) : msg.status === 'delivered' ? (
                                    <CheckCircleIcon className="w-3 h-3 text-white/40" title="Entregue" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-white/20" title="Enviada" />
                                )}
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                {selectedMedia && (
                  <div className="mb-2 relative inline-block">
                    {selectedMedia.imageUrl ? (
                        <img src={selectedMedia.imageUrl} alt="Selected media" className="h-20 w-auto rounded border border-[var(--theme-border-primary)]" />
                    ) : (
                        <video src={selectedMedia.videoUrl} className="h-20 w-auto rounded border border-[var(--theme-border-primary)]" />
                    )}
                    <button 
                        type="button"
                        onClick={() => setSelectedMedia(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                        ×
                    </button>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*,video/*" 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-sm transition-colors ${selectedMedia ? 'bg-[var(--theme-primary)] text-white' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                    title={t('attachMedia')}
                  >
                    <UploadIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={t('typeYourMessage')}
                    className="flex-grow px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                  />
                  <button type="submit" className="bg-[var(--theme-primary)] text-white px-4 py-2 rounded-sm font-bold hover:bg-[var(--theme-secondary)] transition-colors">
                    {t('send')}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
              <MessageIcon className="w-24 h-24 text-[var(--theme-border-primary)]" />
              <h2 className="mt-4 text-xl font-bold text-[var(--theme-text-light)]">{t('selectConversation')}</h2>
              <p className="text-[var(--theme-text-secondary)]">{t('profileFollowers')}, {t('profileFollowing')} & {t('directMessagesTitle')}</p>
            </div>
          )}
        </section>
      </main>
      {isNewMessageModalOpen && (
        <NewMessageModal
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setIsNewMessageModalOpen(false)}
          onSelectUser={async (username) => {
            setIsNewMessageModalOpen(false);
            const options = isEncryptedMode ? { isEncrypted: true, selfDestructTimer: 60 } : undefined;
            const conversationId = await onCreateOrFindConversation(username, options);
            handleSelectConversation(conversationId);
            setIsEncryptedMode(false);
          }}
        />
      )}
    </div>
  );
}
