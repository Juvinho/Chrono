import React, { useState } from 'react';
import { User } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import AvatarStoryWrapper from './AvatarStoryWrapper';

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

    const renderStoryItem = (user: User) => {
        return (
            <div key={user.username} className={variant === 'row' ? 'min-w-[72px]' : 'w-full'}>
                <AvatarStoryWrapper
                    user={user}
                    currentUser={currentUser}
                    size={variant === 'row' ? 'w-16 h-16' : 'w-14 h-14'}
                    onViewStory={onViewStory}
                    onCreateStory={onCreateStory}
                    showName={true}
                />
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
                <div className="grid grid-cols-3 gap-y-4 gap-x-2 justify-items-center">
                    {renderStoryItem(currentUser)}
                    {visibleUsers.map(user => renderStoryItem(user))}
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
            {renderStoryItem(currentUser)}
            {usersWithStories.map(user => renderStoryItem(user))}
        </div>
    );
}
