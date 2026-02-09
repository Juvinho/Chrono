import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';
import { User, Page, Post, CyberpunkReaction, Notification, Conversation } from '../../../types/index';
import Header from '../../../components/ui/Header';
import EchoFrame from './EchoFrame';
import Timeline from './Timeline';
import { SparklesIcon } from '../../../components/ui/icons';
import { isSameDay, dateToUrlSegment, urlSegmentToDate } from '../../../utils/date';

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onNavigate: (page: Page, data?: string) => void;
    onNotificationClick: (notification: Notification) => void;
    onViewNotifications: () => void;
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
    newPostIds: Set<string>;
    allKnownPosts?: Post[];
    onUpdateUser?: (user: User) => void;
    onOpenMarketplace?: () => void;
    onOpenChat?: () => void;
    nextAutoRefresh?: Date | null;
    isAutoRefreshPaused?: boolean;
    onBack?: () => void;
    lastViewedNotifications?: Date | null;
    onPostClick?: (postId: string) => void;
}

export default function Dashboard({ 
    user, onLogout, onNavigate, onNotificationClick, onViewNotifications, selectedDate, setSelectedDate, allUsers, allPosts,
    onNewPost, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost, onPollVote, isGenerating, typingParentIds,
    conversations, newPostsCount = 0, onShowNewPosts, allKnownPosts, onUpdateUser = () => {}, onOpenMarketplace, onOpenChat,
    nextAutoRefresh, isAutoRefreshPaused, onBack, lastViewedNotifications, onPostClick, newPostIds
}: DashboardProps) {
    const { t } = useTranslation();
    const { tag, dateSegment } = useParams<{ tag: string; dateSegment: string }>();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [focusPostId, setFocusPostId] = useState<string | null>(null);
    const [activeCordTag, setActiveCordTag] = useState<string | null>(null);
    const [composerDate, setComposerDate] = useState<Date | null>(null);

    // Sync URL date parameter with selectedDate
    useEffect(() => {
        if (dateSegment) {
            const dateFromUrl = urlSegmentToDate(dateSegment);
            if (dateFromUrl && !isSameDay(dateFromUrl, selectedDate)) {
                setSelectedDate(dateFromUrl);
            }
        }
    }, [dateSegment]); // Remove selectedDate from deps to prevent loop

    // Sync selectedDate to URL when it changes
    useEffect(() => {
        const today = new Date();
        if (isSameDay(selectedDate, today)) {
            // If today, URL should be /echoframe (no date segment)
            if (dateSegment) {
                navigate('/echoframe', { replace: true });
            }
        } else {
            // If other date, URL should include date
            const urlDate = dateToUrlSegment(selectedDate);
            if (dateSegment !== urlDate) {
                navigate(`/echoframe/${urlDate}`, { replace: true });
            }
        }
    }, [selectedDate]); // Remove dateSegment from deps to prevent loop

    useEffect(() => {
        if (tag) {
            const formattedTag = tag.startsWith('$') ? tag : `$${tag}`;
            setActiveCordTag(formattedTag);
        } else {
            setActiveCordTag(null);
        }
    }, [tag]);


    const handleSearch = React.useCallback((query: string) => {
        if (query.startsWith('@')) {
            const username = query.substring(1);
            onNavigate(Page.Profile, username);
            setActiveCordTag(null);
            return;
        }
        if (query.startsWith('$')) {
            handleTagClick(query);
            return;
        }
        setSearchQuery(query);
        setActiveCordTag(null);
    }, [onNavigate]);
    
    const handleTagClick = React.useCallback((tag: string) => {
        const normalized = tag.startsWith('$') ? tag : `$${tag}`;
        setActiveCordTag(normalized);
        setSearchQuery('');
        const cleanTag = normalized.substring(1);
        navigate(`/cordao/${encodeURIComponent(cleanTag)}`);
    }, [navigate]);

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
            // Show posts from selectedDate back to 60+ days ago
            // Compare dates inclusively - include all posts from startDate through selectedDate
            const endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999); // End of selected day
            const startDate = new Date(selectedDate);
            startDate.setDate(startDate.getDate() - 60);
            startDate.setHours(0, 0, 0, 0); // Start of that day
            
            filtered = filtered.filter(p => {
                const postDate = new Date(p.timestamp);
                return postDate >= startDate && postDate <= endDate;
            });
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
                onViewNotifications={onViewNotifications}
                onSearch={handleSearch} 
                onOpenMarketplace={onOpenMarketplace}
                onOpenChat={onOpenChat}
                allPosts={postsForSearch} 
                allUsers={allUsers} 
                conversations={conversations}
                onBack={onBack}
                lastViewedNotifications={lastViewedNotifications}
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
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onPostClick={onPostClick}
                    navigate={navigate}
                    newPostIds={newPostIds}
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
}
