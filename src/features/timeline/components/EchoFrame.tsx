import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Post, User, CyberpunkReaction } from '../../../types/index';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';
import { PostComposer } from './PostComposer';
import { isSameDay } from '../../../utils/date';
import { PlusIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import CordView from '../../messages/components/CordView';
import StoryTray from '../../stories/components/StoryTray';
import { apiClient } from '../../../api';

import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';

interface EchoFrameProps {
    selectedDate: Date;
    currentUser: User;
    posts: Post[];
    onViewProfile: (username: string) => void;
    onTagClick: (tag: string) => void;
    onNewPost: (post: Post) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onReply: (parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }) => void;
    onEcho: (postToEcho: Post) => void;
    onDeletePost: (postId: string) => void;
    onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    searchQuery: string;
    focusPostId: string | null;
    isGenerating: boolean;
    typingParentIds: Set<string>;
    activeCordTag: string | null;
    setActiveCordTag: (tag: string | null) => void;
    composerDate: Date | null;
    setComposerDate: (date: Date | null) => void;
    allKnownPosts?: Post[];
    usersWithStories?: User[];
    onViewStory?: (user: User) => void;
    onCreateStory?: () => void;
    nextAutoRefresh?: Date | null;
    isAutoRefreshPaused?: boolean;
}

export default function EchoFrame({ 
    selectedDate, currentUser, posts: allPosts, onViewProfile, onTagClick, 
    onNewPost, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost, onPollVote, searchQuery, focusPostId, isGenerating,
    typingParentIds, activeCordTag, setActiveCordTag, composerDate, setComposerDate, allKnownPosts,
    usersWithStories = [], onViewStory = () => {}, onCreateStory = () => {},
    nextAutoRefresh, isAutoRefreshPaused
}: EchoFrameProps) {
    const { t } = useTranslation();
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [postToEdit, setPostToEdit] = useState<Post | null>(null);
    const [isCordModalOpen, setIsCordModalOpen] = useState(false);
    const [cordContent, setCordContent] = useState('');
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'All' | 'Following' | 'Trending' | 'Media' | 'Polls'>('All');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Removed local timeToRefresh state to prevent re-renders

    useEffect(() => {
        if (composerDate) {
            setIsComposerOpen(true);
        }
    }, [composerDate]);

    useEffect(() => {
        if (focusPostId) {
            setActivePostId(focusPostId);
        }
    }, [focusPostId]);

    // Use useMemo for filtering to avoid unnecessary effects and state updates
    const displayedPosts = useMemo(() => {
        if (isGenerating) return [];

        let filteredPosts: Post[];
        const lowercasedQuery = searchQuery.toLowerCase();

        if (activeFilter === 'Trending') {
            // Trending: "Quente" - Posts from the last 24 hours, sorted by engagement
            const sourcePosts = allKnownPosts || allPosts;
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);
            
            // Filter posts from the last 24 hours
            filteredPosts = sourcePosts.filter(p => new Date(p.timestamp) >= oneDayAgo);
            
            // Sort by engagement score
            return filteredPosts.sort((a, b) => {
                const getScore = (p: Post) => {
                    const reactionCount = Object.values(p.reactions || {}).reduce((sum, count) => sum + count, 0);
                    const replyCount = p.replies?.length || 0;
                    return (reactionCount * 2 + replyCount * 5);
                };
                return getScore(b) - getScore(a);
            });
        }

        if (searchQuery) {
            const sourcePosts = allKnownPosts || allPosts;
            if (lowercasedQuery.startsWith('$')) {
                 filteredPosts = sourcePosts.filter(p => 
                    p.content.toLowerCase().includes(lowercasedQuery)
                );
            } else {
                filteredPosts = sourcePosts.filter(p => 
                    (p.content.toLowerCase().includes(lowercasedQuery) ||
                    p.author.username.toLowerCase().includes(lowercasedQuery) ||
                    p.id === searchQuery)
                );
            }
        } else {
            // If selected date is today, show all available posts (feed mode)
            // Otherwise filter by specific date (time machine mode)
            if (isSameDay(selectedDate, new Date())) {
                filteredPosts = allPosts;
            } else {
                filteredPosts = allPosts.filter(p => isSameDay(new Date(p.timestamp), selectedDate));
            }
            
            // Apply new filters
            if (activeFilter === 'Following') {
                filteredPosts = filteredPosts.filter(p => 
                    currentUser.followingList?.includes(p.author.username) || p.author.username === currentUser.username
                );
            } else if (activeFilter === 'Media') {
                filteredPosts = filteredPosts.filter(p => !!p.imageUrl || !!p.videoUrl);
            } else if (activeFilter === 'Polls') {
                filteredPosts = filteredPosts.filter(p => !!p.poll?.options && p.poll.options.length > 0);
            }
        }
        
        const visiblePosts = filteredPosts.filter(p => {
            if (!p.isPrivate) return true;
            if (p.author.username === currentUser.username) return true;
            if (currentUser.followingList?.includes(p.author.username)) return true;
            return false;
        });

        return visiblePosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [selectedDate, searchQuery, allPosts, currentUser, isGenerating, activeFilter, allKnownPosts]);

    const handleStartEdit = useCallback((post: Post) => {
        setPostToEdit(post);
        setIsComposerOpen(true);
    }, []);

    const handlePostSubmit = useCallback(async (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>, existingPostId?: string) => {
        if (existingPostId) {
            onEditPost(existingPostId, postData);
            setIsComposerOpen(false);
            setPostToEdit(null);
            return;
        }

        // MIGRATION: Sending new post to Backend
        setIsSubmitting(true);
        try {
            const result = await apiClient.createPost(postData as any);
            
            if (result.error) {
                console.error("Failed to transmit echo to the network:", result.error);
                return;
            }
            
            // The post was created successfully, notify parent to reload data
            if (result.data) {
                const mappedPost = {
                    ...result.data,
                    timestamp: new Date(result.data.createdAt || result.data.created_at || Date.now()),
                    author: currentUser,
                };
                onNewPost(mappedPost);
            }
            
            setIsComposerOpen(false);
        } catch (error) {
            console.error("Failed to transmit echo to the network:", error);
        } finally {
            setIsSubmitting(false);
            setPostToEdit(null);
        }
    }, [onEditPost, onNewPost, currentUser]);

    const handleCordSubmit = useCallback(async () => {
        if (!cordContent.trim()) return;

        // MIGRATION: Sending cord to Backend
        setIsSubmitting(true);
        try {
            const cordData = {
                content: cordContent,
                isThread: true,
                isPrivate: false,
            };

            const result = await apiClient.createPost(cordData);
            
            if (result.error) {
                console.error("Failed to create cord:", result.error);
                return;
            }
            
            if (result.data) {
                const mappedPost = {
                    ...result.data,
                    timestamp: new Date(result.data.createdAt || result.data.created_at || Date.now()),
                    author: currentUser,
                };
                onNewPost(mappedPost);
            }
            
            setCordContent('');
            setIsCordModalOpen(false);
        } catch (error) {
             console.error("Failed to create cord:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [cordContent, onNewPost, currentUser]);

    const isToday = isSameDay(selectedDate, new Date());
    
    const cordTopics = useMemo(() => {
        const topics = new Map<string, number>();
        allPosts.forEach(post => {
            if(post.isThread) {
                const tags = post.content.match(/\$\w+/g) || [];
                tags.forEach(tag => {
                    topics.set(tag, (topics.get(tag) || 0) + 1);
                });
            }
        });
        return Array.from(topics.entries()).sort((a, b) => b[1] - a[1]);
    }, [allPosts]);

    const relatedCords = useMemo(() => {
        if (!activePostId) return [];
        const activePost = allPosts.find(p => p.id === activePostId);
        if (!activePost) return [];
        
        const activeTags = activePost.content.match(/\$\w+/g) || [];
        if (activeTags.length === 0) return [];
        
        return allPosts.filter(p => 
            p.id !== activePostId &&
            p.isThread &&
            activeTags.some(tag => p.content.includes(tag))
        ).slice(0, 5);
    }, [activePostId, allPosts]);

    const recentCords = useMemo(() => {
        return allPosts
            .filter(p => p.isThread)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }, [allPosts]);

    if (activeCordTag) {
        return (
            <CordView
                cordTag={activeCordTag}
                onClose={() => setActiveCordTag(null)}
                allPosts={allPosts}
                currentUser={currentUser}
                onViewProfile={onViewProfile}
                onUpdateReaction={onUpdateReaction}
                onReply={onReply}
                onEcho={onEcho}
                onDeletePost={onDeletePost}
                onEditPost={onEditPost}
                onPollVote={onPollVote}
                onTagClick={onTagClick}
                typingParentIds={typingParentIds}
                onNewPost={onNewPost}
            />
        );
    }

    const handleComposerClose = useCallback(() => {
        setIsComposerOpen(false);
        if (setComposerDate) {
            setComposerDate(null);
        }
    }, [setComposerDate]);

    const renderMobileHeader = () => (
        <div className="lg:hidden mb-6 space-y-4">
            {/* Mobile Stories */}
            <StoryTray 
                currentUser={currentUser}
                usersWithStories={usersWithStories}
                onViewStory={onViewStory}
                onCreateStory={onCreateStory}
                variant="row"
            />

            {/* Mobile Cord Hub (Topics) */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2 flex gap-2 no-scrollbar">
                 <button onClick={() => setIsCordModalOpen(true)} className="flex-shrink-0 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] text-[var(--theme-text-primary)] px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap hover:border-[var(--theme-primary)]">
                     + {t('createCord')}
                 </button>
                 {cordTopics.map(([tag, count]) => (
                     <button 
                        key={tag} 
                        onClick={() => onTagClick(tag)} 
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap border transition-colors ${
                            activeCordTag === tag 
                                ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' 
                                : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border-[var(--theme-border-secondary)]'
                        }`}
                    >
                         {tag} <span className="opacity-70 text-xs">[{count}]</span>
                     </button>
                 ))}
            </div>
        </div>
    );

    const renderCenterColumn = () => {
        if (isGenerating) {
            return (
                <div className="space-y-4">
                    <div className="text-center p-4 flex flex-col items-center justify-center space-y-2">
                        <p className="text-[var(--theme-primary)] animate-pulse font-bold tracking-widest text-sm">{t('generatingReality')}</p>
                    </div>
                    {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                </div>
           );
        }

        const renderFilterBar = () => (
            <div className="mb-4 flex items-center justify-center space-x-2 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] p-1 rounded-sm overflow-x-auto no-scrollbar">
                {(['All', 'Following', 'Trending', 'Media', 'Polls'] as const).map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1 text-sm font-bold transition-colors min-w-[80px] rounded-sm ${
                            activeFilter === filter
                                ? 'bg-[var(--theme-primary)] text-white shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.5)]'
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                        }`}
                    >
                        {t(`filter${filter}` as any) || filter}
                    </button>
                ))}
            </div>
        );

        return (
            <>
                <RefreshTimer nextAutoRefresh={nextAutoRefresh} isPaused={isAutoRefreshPaused} />
                {isToday && !searchQuery && (
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] p-4 mb-4 flex items-center space-x-4">
                        <div className="relative w-10 h-10 flex-shrink-0">
                            {(() => {
                                const avatarShape = currentUser.equippedFrame ? getFrameShape(currentUser.equippedFrame.name) : 'rounded-full';
                                return (
                                    <>
                                        <img 
                                            src={currentUser.avatar} 
                                            alt={currentUser.username} 
                                            className={`w-full h-full ${avatarShape} border-2 border-[var(--theme-border-primary)] object-cover`} 
                                        />
                                        {currentUser.equippedFrame && (
                                            <div className="absolute -inset-1 z-20 pointer-events-none">
                                                <FramePreview item={currentUser.equippedFrame} />
                                            </div>
                                        )}
                                        {currentUser.equippedEffect && (
                                            <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                                <img 
                                                    src={currentUser.equippedEffect.imageUrl} 
                                                    alt="" 
                                                    className="w-full h-full object-cover animate-pulse-soft"
                                                />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                        <button  
                            className="flex-grow bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm py-2 px-3 text-left text-[var(--theme-text-secondary)] cursor-pointer hover:border-[var(--theme-primary)] transition-colors"
                            onClick={() => setIsComposerOpen(true)}
                        >
                            {t('transmitNewEcho')}
                        </button>
                         <button onClick={() => setIsComposerOpen(true)} className="bg-[var(--theme-primary)] text-white p-2 rounded-sm hover:bg-[var(--theme-secondary)] transition-colors hover:animate-pulse-soft">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {!searchQuery && renderFilterBar()}
                {displayedPosts.length > 0 ? (
                    displayedPosts.map((post) => (
                        <div 
                            id={`post-${post.id}`}
                            key={post.id} 
                            onClick={() => setActivePostId(post.id)}
                            className={`${activePostId === post.id ? 'bg-[var(--theme-bg-tertiary)]/30' : ''}`}
                        >
                            <PostCard 
                                post={post} 
                                currentUser={currentUser} 
                                onViewProfile={onViewProfile}
                                onTagClick={onTagClick}
                                onUpdateReaction={onUpdateReaction}
                                onReply={onReply}
                                onEcho={onEcho}
                                onDelete={onDeletePost}
                                onEdit={handleStartEdit}
                                onPollVote={onPollVote}
                                searchQuery={searchQuery}
                                typingParentIds={typingParentIds}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center text-[var(--theme-text-secondary)] p-10 border border-dashed border-[var(--theme-border-primary)]">
                        <p className="text-lg">{searchQuery ? t('noEchoesFoundFor', { query: searchQuery }) : t('noEchoesFoundDate')}</p>
                        <p className="text-sm">{searchQuery ? t('tryDifferentQuery') : t('timelineSilent')}</p>
                    </div>
                )}
            </>
        )
    }

    return (
        <main className="py-4 lg:py-8 max-w-7xl mx-auto px-2 lg:px-4">
            {isComposerOpen && (
                <PostComposer 
                    currentUser={currentUser} 
                    onClose={handleComposerClose}
                    onSubmit={handlePostSubmit}
                    postToEdit={postToEdit}
                    isSubmitting={isSubmitting}
                    initialDate={composerDate || undefined}
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Column: Related/Recent Cords */}
                <aside className="hidden lg:block">
                     <h2 className="text-lg font-bold text-[var(--theme-text-light)] mb-2 pb-2 border-b-2 border-[var(--theme-border-primary)]">
                        :: {activePostId && relatedCords.length > 0 ? t('relatedCords') : t('popularCords')}
                     </h2>
                     {activePostId && relatedCords.length > 0 ? (
                        <div className="space-y-4">
                            {relatedCords.map(post => (
                                <PostCard key={post.id} post={post} currentUser={currentUser} onViewProfile={onViewProfile} onUpdateReaction={onUpdateReaction} onReply={onReply} onEcho={onEcho} onDelete={onDeletePost} onEdit={setPostToEdit} onTagClick={onTagClick} onPollVote={onPollVote} typingParentIds={typingParentIds} compact={true}/>
                            ))}
                        </div>
                     ) : recentCords.length > 0 ? (
                        <div className="space-y-4">
                            {recentCords.map(post => (
                                <PostCard key={post.id} post={post} currentUser={currentUser} onViewProfile={onViewProfile} onUpdateReaction={onUpdateReaction} onReply={onReply} onEcho={onEcho} onDelete={onDeletePost} onEdit={setPostToEdit} onTagClick={onTagClick} onPollVote={onPollVote} typingParentIds={typingParentIds} compact={true}/>
                            ))}
                        </div>
                     ) : (
                        <div className="text-center text-[var(--theme-text-secondary)] p-4 border border-dashed border-[var(--theme-border-secondary)] mt-4">
                            <p className="text-sm">{t('noRelatedCords')}</p>
                        </div>
                     )}

                     {/* Stories Grid */}
                     <StoryTray 
                        currentUser={currentUser}
                        usersWithStories={usersWithStories}
                        onViewStory={onViewStory}
                        onCreateStory={onCreateStory}
                        variant="grid"
                     />
                </aside>
                
                {/* Center Column: Main Feed */}
                <section className="lg:col-span-2">
                    {renderMobileHeader()}
                    {renderCenterColumn()}
                </section>

                {/* Right Column: Cord Hub */}
                <aside className="hidden lg:block">
                     <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-2 pb-2 border-b-2 border-[var(--theme-border-primary)]">:: {t('cordHub')}</h2>
                     <button onClick={() => setIsCordModalOpen(true)} className="create-cord-btn mb-4">
                         {t('createCord')}
                     </button>
                     <div className="space-y-2">
                         {cordTopics.map(([tag, count]) => (
                             <button key={tag} onClick={() => onTagClick(tag)} className="cord-topic-btn">
                                 <span className="font-bold text-[var(--theme-text-primary)]">{tag}</span>
                                 <span className="cord-topic-count">[{count}]</span>
                             </button>
                         ))}
                     </div>
                </aside>
            </div>
            
            {isCordModalOpen && (
                <ConfirmationModal
                    title={t('createCordTitle')}
                    message={t('createCordMessage')}
                    confirmText={isSubmitting ? t('sending') : t('createCordButton')}
                    onConfirm={handleCordSubmit}
                    onCancel={() => setIsCordModalOpen(false)}
                    showCancel={true}
                >
                    <textarea
                        placeholder={t('cordFirstPostPlaceholder')}
                        value={cordContent}
                        onChange={(e) => setCordContent(e.target.value)}
                        className="w-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm py-1 px-3 text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] resize-none mt-4"
                        rows={5}
                        disabled={isSubmitting}
                    />
                </ConfirmationModal>
            )}

        </main>
    );
}

function RefreshTimer({ nextAutoRefresh, isPaused }: { nextAutoRefresh?: Date | null, isPaused?: boolean }) {
    const { t } = useTranslation();
    const [timeToRefresh, setTimeToRefresh] = useState<string>('');

    useEffect(() => {
        if (!nextAutoRefresh) {
            setTimeToRefresh('');
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            const diff = nextAutoRefresh.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeToRefresh('SYNCING...');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeToRefresh(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [nextAutoRefresh]);

    if (!nextAutoRefresh || !timeToRefresh) return null;

    return (
        <div className="flex justify-between items-center bg-[var(--theme-bg-tertiary)]/50 border border-[var(--theme-border-secondary)] px-3 py-1 mb-4 text-xs font-mono text-[var(--theme-text-secondary)] rounded-sm">
            <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className="uppercase tracking-wider">{isPaused ? (t('autoRefreshPaused') || 'PAUSADO (ATIVO)') : (t('autoRefreshActive') || 'AUTO-REFRESH ON')}</span>
            </span>
            <span className="font-bold">SYNC: {timeToRefresh}</span>
        </div>
    );
}