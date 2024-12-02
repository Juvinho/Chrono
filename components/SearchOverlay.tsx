
import React, { useState, useMemo, useEffect } from 'react';
import { Post, User } from '../types';
import { SearchIcon } from './icons';
import PostCard from './PostCard';
import { useTranslation } from '../hooks/useTranslation';
import FramePreview, { getFrameShape } from './FramePreview';
import Avatar from './Avatar';
import { apiClient } from '../services/api';

interface SearchOverlayProps {
    onClose: () => void;
    onSearch: (query: string) => void;
    onViewProfile: (username: string) => void;
    allUsers: User[];
    allPosts: Post[];
    currentUser: User;
}

const NoSignal: React.FC<{ message?: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-64 w-full bg-black relative overflow-hidden border border-[var(--theme-border-primary)] rounded-sm my-4">
      {/* Static Noise Layer */}
      <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-screen" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
           }}
      />
      <style>{`
        @keyframes staticShift {
            0% { background-position: 0 0; }
            20% { background-position: 10px -5px; }
            40% { background-position: -10px 5px; }
            60% { background-position: 5px -10px; }
            80% { background-position: -5px 10px; }
            100% { background-position: 0 0; }
        }
        .animate-static {
            animation: staticShift 0.2s infinite steps(4);
        }
      `}</style>
      
      {/* Glitch Text */}
      <div className="relative z-10 text-center space-y-2 p-4 bg-black/50 backdrop-blur-sm border border-red-900/50">
          <h3 className="text-3xl font-bold text-red-500 tracking-[0.2em] animate-pulse glitch-effect" data-text="NO SIGNAL">NO SIGNAL</h3>
          <p className="text-[var(--theme-text-secondary)] font-mono text-sm uppercase tracking-widest">{message || "Target not found in timeline"}</p>
      </div>
      
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-30"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,black_100%)] pointer-events-none z-20"></div>
    </div>
);

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose, onSearch, onViewProfile, allUsers, allPosts, currentUser }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const response = await apiClient.searchUsers(searchTerm.trim());
                    if (response.data) {
                        setSearchResults(response.data);
                    } else {
                        setSearchResults([]);
                    }
                } catch (error) {
                    console.error("Search failed", error);
                    setSearchResults([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    };

    const { popularCords, popularPosts, relevantUsers, foundUsers, foundCords, foundPosts, hasResults } = useMemo(() => {
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
        let hasResults = false;

        if (searchTerm.trim()) {
            // Use API results for users
            foundUsers = searchResults;
            
            // Keep client-side filtering for posts (or implement API search for posts later)
            const lowerQuery = searchTerm.toLowerCase();
            const matchingPosts = allPosts.filter(p => 
                p.content.toLowerCase().includes(lowerQuery) || 
                p.author.username.toLowerCase().includes(lowerQuery)
            );

            foundCords = matchingPosts.filter(p => p.isThread);
            foundPosts = matchingPosts.filter(p => !p.isThread);
            
            hasResults = foundUsers.length > 0 || foundCords.length > 0 || foundPosts.length > 0;
        }

        return { popularCords, popularPosts, relevantUsers, foundUsers, foundCords, foundPosts, hasResults };
    }, [allPosts, allUsers, currentUser, searchTerm, searchResults]);

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
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-[var(--theme-text-secondary)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
                        ) : (
                            <SearchIcon className="w-8 h-8 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors" />
                        )}
                    </button>
                </form>

                {searchTerm.trim() ? (
                    isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 animate-pulse space-y-4">
                             <div className="w-16 h-16 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                             <p className="text-[var(--theme-primary)] font-mono tracking-widest glitch-effect" data-text="ACCESSING MAINFRAME...">ACCESSING MAINFRAME...</p>
                        </div>
                    ) : hasResults ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                         <div className="space-y-4">
                            <h2 className="search-section-header">:: {t('foundUsers')}</h2>
                            {foundUsers.length > 0 ? (
                                foundUsers.map(user => {
                                    const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                                    return (
                                        <div 
                                            key={user.username} 
                                            onClick={() => onViewProfile(user.username)} 
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && onViewProfile(user.username)}
                                            className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                        >
                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                <Avatar src={user.avatar} username={user.username} className={`w-full h-full ${avatarShape} object-cover`} />
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
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[var(--theme-text-light)] group-hover:text-[var(--theme-primary)] transition-colors truncate">@{user.username}</p>
                                                {user.displayName && <p className="text-sm text-[var(--theme-text-secondary)] truncate">{user.displayName}</p>}
                                                <div className="flex space-x-3 mt-1 text-xs text-[var(--theme-text-secondary)]">
                                                    <span><span className="font-bold text-[var(--theme-text-primary)]">{user.followers || 0}</span> followers</span>
                                                    <span><span className="font-bold text-[var(--theme-text-primary)]">{user.following || 0}</span> following</span>
                                                </div>
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
                                    <div 
                                        key={cord.id} 
                                        onClick={() => onSearch(`${cord.id}`)} 
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && onSearch(`${cord.id}`)}
                                        className="search-result-item text-sm cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                    >
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
                                    <div 
                                        key={post.id} 
                                        onClick={() => onSearch(`${post.id}`)} 
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && onSearch(`${post.id}`)}
                                        className="search-result-item text-sm cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                    >
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
                        <div className="flex flex-col space-y-8 animate-[fadeIn_0.5s_ease-out]">
                            <NoSignal message={t('noResultsFound') || "NO DATA FOUND IN ARCHIVES"} />
                            
                            <div className="border-t border-[var(--theme-border-primary)] pt-8">
                                <h3 className="text-xl font-bold text-[var(--theme-secondary)] mb-6 text-center glitch-effect" data-text={t('recommendedForYou')}>:: {t('recommendedForYou') || "ALTERNATIVE TIMELINES"}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <h2 className="search-section-header">:: {t('relevantUsers')}</h2>
                                        {relevantUsers.map(user => (
                                            <div key={user.username} onClick={() => onViewProfile(user.username)} className="flex items-center space-x-3 cursor-pointer group">
                                                <div className="relative w-8 h-8 flex-shrink-0">
                                                    <Avatar src={user.avatar} username={user.username} className="w-full h-full rounded-full object-cover" />
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
                            </div>
                        </div>
                    )
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
                                                    <Avatar src={user.avatar} username={user.username} className={`w-full h-full ${avatarShape} object-cover`} />
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