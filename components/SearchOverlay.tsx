
import React, { useState, useMemo } from 'react';
import { Post, User } from '../types';
import { SearchIcon } from './icons';
import PostCard from './PostCard';
import { useTranslation } from '../hooks/useTranslation';
import FramePreview, { getFrameShape } from './FramePreview';

interface SearchOverlayProps {
    onClose: () => void;
    onSearch: (query: string) => void;
    onViewProfile: (username: string) => void;
    allUsers: User[];
    allPosts: Post[];
    currentUser: User;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose, onSearch, onViewProfile, allUsers, allPosts, currentUser }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    };

    const { popularCords, popularPosts, relevantUsers, foundUsers, foundCords, foundPosts } = useMemo(() => {
        const getPopularity = (post: Post) => post.reactions ? Object.values(post.reactions).reduce((a, c) => a + c, 0) : 0;

        const popularCords = [...allPosts]
            .filter(p => p.isThread)
            .sort((a, b) => getPopularity(b) - getPopularity(a))
            .slice(0, 3);
        
        const popularPosts = [...allPosts]
            .filter(p => !p.isThread)
            .sort((a, b) => getPopularity(b) - getPopularity(a))
            .slice(0, 5);
        
        const relevantUsers = allUsers
            .filter(u => u.username !== currentUser.username && !currentUser.followingList?.includes(u.username))
            .slice(0, 5);

        let foundUsers: User[] = [];
        let foundCords: Post[] = [];
        let foundPosts: Post[] = [];

        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase();
            foundUsers = allUsers.filter(u => 
                u.username.toLowerCase().includes(lowerQuery) || 
                (u.displayName && u.displayName.toLowerCase().includes(lowerQuery))
            );
            
            const matchingPosts = allPosts.filter(p => 
                p.content.toLowerCase().includes(lowerQuery) || 
                p.author.username.toLowerCase().includes(lowerQuery)
            );

            foundCords = matchingPosts.filter(p => p.isThread);
            foundPosts = matchingPosts.filter(p => !p.isThread);
        }

        return { popularCords, popularPosts, relevantUsers, foundUsers, foundCords, foundPosts };
    }, [allPosts, allUsers, currentUser, searchTerm]);

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="search-overlay-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSearchSubmit} className="relative mb-8">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('searchChrono')}
                        autoFocus
                        className="search-input"
                    />
                    <button type="submit" aria-label={t('search')} className="absolute right-4 top-1/2 -translate-y-1/2">
                        <SearchIcon className="w-8 h-8 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors" />
                    </button>
                </form>

                {searchTerm.trim() ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                         <div className="space-y-4">
                            <h2 className="search-section-header">:: {t('foundUsers')}</h2>
                            {foundUsers.length > 0 ? (
                                foundUsers.map(user => {
                                    const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                                    return (
                                        <div key={user.username} onClick={() => onViewProfile(user.username)} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors">
                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                <img src={user.avatar} alt={user.username} className={`w-full h-full ${avatarShape} object-cover`}/>
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
                                            <div>
                                                <p className="font-bold text-[var(--theme-text-light)] group-hover:text-[var(--theme-primary)] transition-colors">@{user.username}</p>
                                                {user.displayName && <p className="text-sm text-[var(--theme-text-secondary)]">{user.displayName}</p>}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-[var(--theme-text-secondary)] italic text-sm">{t('noUsersFound')}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="search-section-header">:: {t('foundCords')}</h2>
                            {foundCords.length > 0 ? (
                                foundCords.map(cord => (
                                    <div key={cord.id} onClick={() => onSearch(`${cord.id}`)} className="search-result-item text-sm cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors">
                                        <p className="truncate font-bold text-[var(--theme-text-primary)]">{cord.content}</p>
                                        <p className="text-xs text-[var(--theme-text-secondary)]">{t('byUser', { username: cord.author.username })}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[var(--theme-text-secondary)] italic text-sm">{t('noRelatedCords')}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="search-section-header">:: {t('foundEchoes')}</h2>
                            {foundPosts.length > 0 ? (
                                foundPosts.map(post => (
                                    <div key={post.id} onClick={() => onSearch(`${post.id}`)} className="search-result-item text-sm cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors">
                                        <p className="truncate text-[var(--theme-text-primary)]">{post.content}</p>
                                        <p className="text-xs text-[var(--theme-text-secondary)]">{t('byUser', { username: post.author.username })}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[var(--theme-text-secondary)] italic text-sm">{t('noEchoesFoundFor', { query: searchTerm })}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h2 className="search-section-header">:: {t('relevantUsers')}</h2>
                            {relevantUsers.map(user => (
                                <div key={user.username} onClick={() => onViewProfile(user.username)} className="flex items-center space-x-3 cursor-pointer group">
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                        {(() => {
                                            const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                                            return (
                                                <>
                                                    <img src={user.avatar} alt={user.username} className={`w-full h-full ${avatarShape} object-cover`} />
                                                    {user.equippedFrame && (
                                                        <div className="absolute -inset-1 z-20 pointer-events-none">
                                                            <FramePreview item={user.equippedFrame} />
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <span className="text-[var(--theme-text-primary)] group-hover:text-[var(--theme-secondary)]">@{user.username}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <h2 className="search-section-header">:: {t('popularCords')}</h2>
                            {popularCords.map(cord => (
                               <div key={cord.id} onClick={() => onSearch(`${cord.id}`)} className="search-result-item text-sm">
                                    <p className="truncate text-[var(--theme-text-primary)]">{cord.content}</p>
                                    <p className="text-xs text-[var(--theme-text-secondary)]">{t('byUser', { username: cord.author.username })}</p>
                                </div>
                            ))}
                        </div>
                         <div className="space-y-2">
                            <h2 className="search-section-header">:: {t('popularPosts')}</h2>
                            {popularPosts.map(post => (
                                <div key={post.id} onClick={() => onSearch(`${post.id}`)} className="search-result-item text-sm">
                                    <p className="truncate text-[var(--theme-text-primary)]">{post.content}</p>
                                    <p className="text-xs text-[var(--theme-text-secondary)]">{t('byUser', { username: post.author.username })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchOverlay;