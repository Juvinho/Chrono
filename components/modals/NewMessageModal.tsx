
import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../FramePreview';

interface NewMessageModalProps {
  allUsers: User[];
  currentUser: User;
  onClose: () => void;
  onSelectUser: (username: string) => void;
}

export default function NewMessageModal({ allUsers, currentUser, onClose, onSelectUser }: NewMessageModalProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return allUsers.filter(user => 
      user.username.toLowerCase().includes(lowercasedTerm) &&
      user.username !== currentUser.username
    );
  }, [searchTerm, allUsers, currentUser.username]);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex justify-between items-center pb-2 border-b border-[var(--theme-border-primary)]">
          <h2 className="text-lg font-bold text-[var(--theme-text-light)]">{t('newMessageTitle')}</h2>
          <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>
        </div>
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchForUser')}
          autoFocus
          className="w-full px-3 py-2 mt-4 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
        />
        
        <div className="flex-grow overflow-y-auto mt-4 pr-2">
          {filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map(user => {
                const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                return (
                  <button 
                    key={user.username} 
                    onClick={() => onSelectUser(user.username)} 
                    className="flex items-center space-x-3 p-2 hover:bg-[var(--theme-bg-tertiary)] cursor-pointer w-full text-left transition-colors"
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
                      <p className="text-sm text-[var(--theme-text-secondary)] truncate">{user.bio}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            searchTerm.trim() && <p className="text-center text-[var(--theme-text-secondary)]">{t('noUsersFound')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
