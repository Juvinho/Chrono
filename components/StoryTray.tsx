import React, { useState } from 'react';
import { User, Story } from '../types';
import { PlusIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import FramePreview, { getFrameShape } from './FramePreview';

interface StoryTrayProps {
    currentUser: User;
    usersWithStories: User[];
    onViewStory: (user: User) => void;
    onCreateStory: () => void;
    variant?: 'row' | 'grid';
}

export default function StoryTray({ currentUser, usersWithStories, onViewStory, onCreateStory, variant = 'row' }: StoryTrayProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const hasMyStory = currentUser.stories && currentUser.stories.length > 0;

    const renderStoryItem = (user: User, isCurrentUser: boolean) => {
        const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
        return (
            <div 
                key={user.username} 
                className={`flex flex-col items-center gap-1 cursor-pointer ${variant === 'row' ? 'min-w-[72px]' : 'w-full'}`} 
                onClick={() => isCurrentUser ? (hasMyStory ? onViewStory(user) : onCreateStory()) : onViewStory(user)}
            >
                <div className={`relative ${variant === 'row' ? 'w-16 h-16' : 'w-14 h-14'} ${avatarShape} p-[2px] ${
                    isCurrentUser 
                        ? (hasMyStory ? 'bg-gradient-to-tr from-purple-600 to-purple-400' : 'border-2 border-[var(--theme-border)] border-dashed')
                        : 'bg-gradient-to-tr from-purple-600 to-purple-400 animate-pulse-slow'
                }`}>
                    <div className={`w-full h-full ${avatarShape} overflow-hidden bg-[var(--theme-bg-primary)] p-[2px] relative z-10`}>
                        <img 
                            src={user.avatar || 'https://via.placeholder.com/150'} 
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
                    </div>
                    {user.equippedFrame && (
                        <div className="absolute -inset-1 z-20 pointer-events-none">
                            <FramePreview item={user.equippedFrame} />
                        </div>
                    )}
                    {isCurrentUser && !hasMyStory && (
                        <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1 border-2 border-[var(--theme-bg-primary)] z-30">
                            <PlusIcon className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
                <span className="text-xs text-[var(--theme-text-secondary)] truncate w-full text-center">
                    {isCurrentUser ? (t('yourStory') || 'Seu Story') : user.username}
                </span>
            </div>
        );
    };

    if (variant === 'grid') {
        // 3x3 Grid = 9 items max.
        // Item 1 is always Current User.
        // So we show 8 other users initially.
        const visibleUsers = isExpanded ? usersWithStories : usersWithStories.slice(0, 8);
        const hasMore = usersWithStories.length > 8;

        return (
            <div className="w-full p-4 border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] rounded-sm mt-4">
                <h3 className="text-xs font-bold text-[var(--theme-text-secondary)] mb-3 uppercase tracking-wider">
                    Stories
                </h3>
                <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                    {renderStoryItem(currentUser, true)}
                    {visibleUsers.map(user => renderStoryItem(user, false))}
                </div>
                {hasMore && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full mt-3 flex items-center justify-center text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto py-4 px-2 flex gap-4 no-scrollbar border-b border-[var(--theme-border)] bg-[var(--theme-bg-secondary)]/30 backdrop-blur-sm">
            {renderStoryItem(currentUser, true)}
            {usersWithStories.map(user => renderStoryItem(user, false))}
        </div>
    );
    );
}
