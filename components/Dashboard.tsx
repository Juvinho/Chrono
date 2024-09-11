import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { User, Page, Post, CyberpunkReaction, Notification, Conversation, Story } from '../types';
import Header from './Header';
import EchoFrame from './EchoFrame';
import Timeline from './Timeline';
import StoryTray from './StoryTray';
import { SparklesIcon } from './icons';

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onNavigate: (page: Page, data?: string) => void;
    onNotificationClick: (notification: Notification) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    allUsers: User[];
    allPosts: Post[];
    onNewPost: (post: Post) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onReply: (parentPostId: string, content: string, isPrivate: boolean) => void;
    onEcho: (postToEcho: Post) => void;
    onDeletePost: (postId: string) => void;
    onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    isGenerating: boolean;
    typingParentIds: Set<string>;
    conversations: Conversation[];
    newPostsCount?: number;
    onShowNewPosts?: () => void;
    allKnownPosts?: Post[];
    usersWithStories?: User[];
    onViewStory?: (user: User) => void;
    onCreateStory?: () => void;
    onUpdateUser?: (user: User) => void;
    onOpenMarketplace?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    user, onLogout, onNavigate, onNotificationClick, selectedDate, setSelectedDate, allUsers, allPosts,
    onNewPost, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost, onPollVote, isGenerating, typingParentIds,
    conversations, newPostsCount = 0, onShowNewPosts, allKnownPosts, usersWithStories = [], onViewStory = () => {}, onCreateStory = () => {}, onUpdateUser = () => {}, onOpenMarketplace
}) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [focusPostId, setFocusPostId] = useState<string | null>(null);
    const [activeCordTag, setActiveCordTag] = useState<string | null>(null);
    const [composerDate, setComposerDate] = useState<Date | null>(null);


    const handleSearch = React.useCallback((query: string) => {
        if (query.startsWith('@')) {
            const username = query.substring(1);
            onNavigate(Page.Profile, username);
        } else {
            setSearchQuery(query);
        }
        setActiveCordTag(null); // When searching, always leave cord view
    }, [onNavigate]);
    
    const handleTagClick = React.useCallback((tag: string) => {
        setActiveCordTag(tag);
        setSearchQuery('');

        if (typeof window !== 'undefined' && window.history && window.location) {
            const monthSlugs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const formatDateSegment = (date: Date) => {
                const month = monthSlugs[date.getMonth()];
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}-${day}-${year}`;
            };

            const cleanTag = tag.startsWith('$') ? tag.substring(1) : tag;
            const today = new Date();
            const isToday = today.toDateString() === selectedDate.toDateString();

            let path = `/$${encodeURIComponent(cleanTag)}`;
            if (!isToday) {
                path = `${path}/${formatDateSegment(selectedDate)}`;
            }

            const currentFullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const nextFullPath = `${path}${window.location.search}${window.location.hash}`;
            if (currentFullPath !== nextFullPath) {
                window.history.pushState({ cordTag: tag, date: selectedDate.toISOString() }, '', nextFullPath);
            }
        }
    }, [selectedDate]);

    const handleViewProfile = React.useCallback((username: string) => {
        onNavigate(Page.Profile, username);
    }, [onNavigate]);

    useEffect(() => {
        const pendingQuery = sessionStorage.getItem('chrono_search_query');
        if (pendingQuery) {
            if (pendingQuery.startsWith('$')) {
                handleTagClick(pendingQuery);
            } else {
                handleSearch(pendingQuery);
            }
            sessionStorage.removeItem('chrono_search_query');
        }
        const postIdToFocus = sessionStorage.getItem('chrono_focus_post_id');
        if (postIdToFocus) {
            setFocusPostId(postIdToFocus);
            sessionStorage.removeItem('chrono_focus_post_id');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (focusPostId) {
            // Use a timeout to allow EchoFrame to filter and render the post first
            const timer = setTimeout(() => {
                const element = document.getElementById(`post-${focusPostId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [focusPostId, allPosts, selectedDate]);

    const postsForSearch = React.useMemo(() => {
        const source = allKnownPosts || allPosts;
        return [...source].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allKnownPosts, allPosts]);

    const postsForFeed = React.useMemo(() => {
        // If searching or filtering by tag, use the full list (postsForSearch)
        // Otherwise use the feed list (allPosts)
        let source = (activeCordTag || searchQuery) ? postsForSearch : allPosts;
        let filtered = source;

        if (activeCordTag) {
            filtered = filtered.filter(p => 
                p.content.includes(activeCordTag) || 
                (p.tags && p.tags.includes(activeCordTag))
            );
        } else if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.content.toLowerCase().includes(query) || 
                p.author.username.toLowerCase().includes(query) ||
                p.author.displayName.toLowerCase().includes(query)
            );
        } else {
            filtered = filtered.filter(p => new Date(p.timestamp).toDateString() === selectedDate.toDateString());
        }
        return filtered;
    }, [postsForSearch, allPosts, activeCordTag, searchQuery, selectedDate]);


    return (
        <div className="h-screen w-screen flex flex-col bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
            <Header 
                user={user} 
                onLogout={onLogout} 
                onViewProfile={handleViewProfile} 
                onNavigate={onNavigate}
                onNotificationClick={onNotificationClick}
                onSearch={handleSearch} 
                onOpenMarketplace={onOpenMarketplace}
                allPosts={postsForSearch} 
                allUsers={allUsers} 
                conversations={conversations}
            />
            <div className="flex-grow overflow-y-auto relative">
                {newPostsCount > 0 && onShowNewPosts && (
                    <div className="sticky top-4 z-50 flex justify-center w-full pointer-events-none mb-[-40px]">
                        <button 
                            onClick={onShowNewPosts}
                            className="bg-[var(--theme-accent)] text-[var(--theme-bg-primary)] px-4 py-2 rounded-full shadow-lg 
                                     flex items-center gap-2 pointer-events-auto hover:brightness-110 
                                     cursor-pointer transition-all transform hover:scale-105 border border-[var(--theme-border)]"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span className="font-bold">{t('showNewPosts', { count: newPostsCount })}</span>
                        </button>
                    </div>
                )}
                <EchoFrame 
                    currentUser={user} 
                    posts={postsForFeed}
                    allKnownPosts={postsForSearch}
                    selectedDate={selectedDate} 
                    onViewProfile={handleViewProfile} 
                    searchQuery={searchQuery}
                    focusPostId={focusPostId}
                    onTagClick={handleTagClick}
                    onNewPost={onNewPost}
                    onUpdateReaction={onUpdateReaction}
                    onReply={onReply}
                    onEcho={onEcho}
                    onDeletePost={onDeletePost}
                    onEditPost={onEditPost}
                    onPollVote={onPollVote}
                    isGenerating={isGenerating}
                    typingParentIds={typingParentIds}
                    activeCordTag={activeCordTag}
                    setActiveCordTag={setActiveCordTag}
                    composerDate={composerDate}
                    setComposerDate={setComposerDate}
                    usersWithStories={usersWithStories}
                    onViewStory={onViewStory}
                    onCreateStory={onCreateStory}
                />
            </div>
            <Timeline 
                selectedDate={selectedDate}  
                setSelectedDate={setSelectedDate} 
                onNavigate={onNavigate} 
                allPosts={allPosts} 
                onOpenComposer={setComposerDate}
            />
        </div>
    );
};

export default Dashboard;
