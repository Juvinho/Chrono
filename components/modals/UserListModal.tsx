
import React from 'react';
import { User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../FramePreview';

interface UserListModalProps {
  title: string;
  users: User[];
  currentUser: User;
  onFollowToggle: (username: string) => void;
  onClose: () => void;
  onViewProfile: (username: string) => void;
}

export default function UserListModal({ title, users, currentUser, onFollowToggle, onClose, onViewProfile }: UserListModalProps) {
    const { t } = useTranslation();
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content w-full max-w-md max-h-[70vh] flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--theme-border-primary)]">
                    <h2 className="text-lg font-bold text-[var(--theme-text-light)]">{title}</h2>
                    <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto mt-4 pr-2">
                    {users.length > 0 ? (
                        <div className="space-y-3">
                            {users.map(user => {
                                const isCurrentUser = user.username === currentUser.username;
                                const isFollowing = currentUser.followingList?.includes(user.username);
                                const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                                return (
                                    <div key={user.username} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div 
                                                className="relative w-10 h-10 flex-shrink-0 cursor-pointer"
                                                onClick={() => onViewProfile(user.username)}
                                            >
                                                <img 
                                                    src={user.avatar} 
                                                    alt={user.username} 
                                                    className={`w-full h-full ${avatarShape} object-cover`}
                                                />
                                                {user.equippedEffect && (
                                                    <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                                        <img 
                                                            src={user.equippedEffect.imageUrl} 
                                                            alt="" 
                                                            className="w-full h-full object-cover animate-pulse-soft"
                                                        />
                                                    </div>
                                                )}
                                                {user.equippedFrame && (
                                                    <div className="absolute -inset-1 z-20 pointer-events-none">
                                                        <FramePreview item={user.equippedFrame} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p 
                                                    className="font-bold text-[var(--theme-text-light)] hover:underline cursor-pointer"
                                                    onClick={() => onViewProfile(user.username)}
                                                >
                                                    @{user.username}
                                                </p>
                                                <p className="text-sm text-[var(--theme-text-secondary)] truncate">{user.bio}</p>
                                            </div>
                                        </div>
                                        {!isCurrentUser && (
                                            <button 
                                                onClick={() => onFollowToggle(user.username)}
                                                className={`px-3 py-1 text-sm rounded-sm transition-colors ${isFollowing ? 'following-btn' : 'follow-btn'}`}
                                            >
                                                {isFollowing ? t('profileFollowing') : t('profileFollow')}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                         <p className="text-center text-[var(--theme-text-secondary)]">{t('noUsersFound')}</p>
                    )}
                </div>
            </div>
        </div>
    );
}