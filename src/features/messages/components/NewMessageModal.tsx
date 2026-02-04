
import React, { useState, useEffect } from 'react';
import { User } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';
import { apiClient } from '../../../utils/api';

interface NewMessageModalProps {
  currentUser: User;
  onClose: () => void;
  onSelectUser: (username: string) => void;
}

export default function NewMessageModal({ currentUser, onClose, onSelectUser }: NewMessageModalProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsLoading(true);
        try {
          const res = await apiClient.searchUsers(searchTerm);
          if (res.data) {
            setResults(res.data.filter((u: User) => u.username !== currentUser.username));
          }
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (searchTerm.trim().length === 0) {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser.username]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content w-full max-w-md max-h-[70vh] flex flex-col overflow-x-hidden">
        <div className="flex justify-between items-center pb-2 border-b border-[var(--theme-border-primary)]">
          <h2 className="text-lg font-bold text-[var(--theme-text-light)]">{t('newMessageTitle')}</h2>
          <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>
        </div>
        
        <div className="relative mt-4">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchForUser')}
                autoFocus
                className="w-full px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            />
            {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
        
        <div className="flex-grow overflow-y-auto overflow-x-hidden mt-4 pr-2 chrono-scrollbar">
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map(user => {
                const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                const bioText = (user.bio || '').length > 40 ? (user.bio || '').slice(0, 40) + '…' : (user.bio || '');
                return (
                  <button 
                    key={user.username} 
                    onClick={() => onSelectUser(user.username)} 
                    className="flex items-center space-x-3 p-2 hover:bg-[var(--theme-bg-tertiary)] cursor-pointer w-full text-left transition-colors border border-transparent hover:border-[var(--theme-border-primary)]"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <img src={user.avatar} alt={user.username} className={`w-full h-full ${avatarShape} object-cover`} />
                      {user.equippedFrame && (
                        <div className="absolute -inset-1 z-20 pointer-events-none">
                          <FramePreview item={user.equippedFrame} />
                        </div>
                      )}
                      {user.equippedEffect && (
                        <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                          <img 
                            src={user.equippedEffect.imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover animate-pulse-soft"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-[var(--theme-text-light)] truncate">@{user.username}</p>
                      <p className="text-xs text-[var(--theme-text-secondary)] truncate">{bioText}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            searchTerm.trim().length >= 2 && !isLoading && <p className="text-center text-[var(--theme-text-secondary)] py-8">{t('noUsersFound')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
