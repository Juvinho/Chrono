import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Conversation, Message } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { UploadIcon, CheckCircleIcon, LockClosedIcon, MessageIcon } from '../../../components/ui/icons';
import Avatar from '../../profile/components/Avatar';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';

interface ChatWindowProps {
  currentUser: User;
  otherUser: User;
  conversation: Conversation | null;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (recipientUsername: string, text: string, media?: { imageUrl?: string, videoUrl?: string }) => void;
  onMarkAsRead: (conversationId: string) => void;
  isMinimized?: boolean;
}

export default function ChatWindow({ 
  currentUser, 
  otherUser, 
  conversation, 
  onClose, 
  onMinimize, 
  onSendMessage,
  onMarkAsRead,
  isMinimized = false
}: ChatWindowProps) {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ imageUrl?: string, videoUrl?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized && conversation) {
      onMarkAsRead(conversation.id);
    }
  }, [conversation?.messages.length, isMinimized, conversation?.id, onMarkAsRead]);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedMedia)) return;
    onSendMessage(otherUser.username, messageText.trim(), selectedMedia || undefined);
    setMessageText('');
    setSelectedMedia(null);
  };

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

  const avatarShape = otherUser.equippedFrame ? getFrameShape(otherUser.equippedFrame.name) : 'rounded-full';

  if (isMinimized) {
    return (
      <div 
        onClick={onMinimize}
        className="w-48 bg-[var(--theme-bg-secondary)] border-t-2 border-x-2 border-[var(--theme-primary)] rounded-t-lg p-2 flex items-center space-x-2 cursor-pointer hover:bg-[var(--theme-bg-tertiary)] transition-colors shadow-[0_-5px_15px_rgba(var(--theme-primary-rgb),0.2)]"
      >
        <div className="relative w-8 h-8 flex-shrink-0">
          <Avatar src={otherUser.avatar} username={otherUser.username} className={`w-full h-full ${avatarShape} object-cover`} />
        </div>
        <span className="text-xs font-bold text-[var(--theme-text-light)] truncate flex-grow">@{otherUser.username}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-[var(--theme-text-secondary)] hover:text-red-500">×</button>
      </div>
    );
  }

  return (
    <div className="w-80 h-[450px] bg-[var(--theme-bg-secondary)] border-2 border-[var(--theme-border-primary)] rounded-t-lg flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-fade-in overflow-hidden">
      {/* Header */}
      <div 
        className="p-2 bg-[var(--theme-bg-tertiary)] border-b border-[var(--theme-border-primary)] flex items-center justify-between cursor-pointer"
        onClick={onMinimize}
      >
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <Avatar src={otherUser.avatar} username={otherUser.username} className={`w-full h-full ${avatarShape} object-cover`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-light)]">@{otherUser.username}</h3>
            <p className="text-[10px] text-[var(--theme-text-secondary)]">Online</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-[var(--theme-text-secondary)] hover:text-red-500 text-xl font-bold px-1">×</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-[var(--theme-bg-primary)]/50">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
            <MessageIcon className="w-12 h-12 mb-2" />
            <p className="text-xs">{t('startConversation') || 'Comece uma nova conversa'}</p>
          </div>
        ) : (
          conversation.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.senderUsername === currentUser.username ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-2 rounded-lg text-xs ${msg.senderUsername === currentUser.username ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)]'}`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Media" className="max-w-full rounded-sm mb-1" />
                )}
                {msg.videoUrl && (
                  <video src={msg.videoUrl} controls className="max-w-full rounded-sm mb-1" />
                )}
                <p className="break-words">{msg.text}</p>
                <div className="flex items-center justify-between mt-1 opacity-60">
                  <span className="text-[9px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.senderUsername === currentUser.username && (
                    <div className="flex items-center ml-1">
                      {msg.status === 'read' ? (
                        <CheckCircleIcon className="w-2 h-2 text-emerald-400" />
                      ) : (
                        <CheckCircleIcon className="w-2 h-2 text-white/40" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 bg-[var(--theme-bg-tertiary)] border-t border-[var(--theme-border-primary)]">
        {selectedMedia && (
          <div className="mb-1 relative inline-block">
             <img src={selectedMedia.imageUrl || selectedMedia.videoUrl} className="h-10 w-auto rounded border border-[var(--theme-border-primary)]" alt="Preview" />
             <button type="button" onClick={() => setSelectedMedia(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]"
          >
            <UploadIcon className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t('typeYourMessage')}
            className="flex-grow px-2 py-1 text-xs text-[var(--theme-text-primary)] bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] rounded-sm"
          />
          <button type="submit" className="bg-[var(--theme-primary)] text-white px-3 py-1 text-xs font-bold rounded-sm hover:brightness-110 transition-all">
            {t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}
