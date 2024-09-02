import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Post, User, CyberpunkReaction } from '../types';
import PostCard from './PostCard';
import { PostComposer } from './PostComposer';
import { isSameDay } from '../utils/date';
import { PlusIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import ConfirmationModal from './modals/ConfirmationModal';
import CordView from './CordView';
import StoryTray from './StoryTray';
import { apiClient } from '../services/api';

import FramePreview, { getFrameShape } from './FramePreview';

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
    onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
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
}

const EchoFrame: React.FC<EchoFrameProps> = ({ 
    selectedDate, currentUser, posts: allPosts, onViewProfile, onTagClick, 
    onNewPost, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost, onPollVote, searchQuery, focusPostId, isGenerating,
    typingParentIds, activeCordTag, setActiveCordTag, composerDate, setComposerDate, allKnownPosts,
    usersWithStories = [], onViewStory = () => {}, onCreateStory = () => {}
}) => {
    const { t } = useTranslation();
    const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [postToEdit, setPostToEdit] = useState<Post | null>(null);
    const [isCordModalOpen, setIsCordModalOpen] = useState(false);
    const [cordContent, setCordContent] = useState('');
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'All' | 'Following' | 'Media' | 'Polls'>('All');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const prevSelectedDate = useRef(selectedDate);
    const prevSearchQuery = useRef(searchQuery);
    const prevFilter = useRef(activeFilter);

    useEffect(() => {
        if (isGenerating) return;

        const isContextSwitch = 
            !isSameDay(prevSelectedDate.current, selectedDate) || 
            prevSearchQuery.current !== searchQuery || 
            prevFilter.current !== activeFilter;

        if (isContextSwitch) {
            setIsLoading(true);
            prevSelectedDate.current = selectedDate;
            prevSearchQuery.current = searchQuery;
            prevFilter.current = activeFilter;
        }
        
        if (!focusPostId) {
            setActivePostId(null);
        }
        let filteredPosts: Post[];
        const lowercasedQuery = searchQuery.toLowerCase();

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
                filteredPosts = allPosts.filter(p => isSameDay(p.timestamp, selectedDate));
            }
            
            // Apply new filters
            if (activeFilter === 'Following') {
                filteredPosts = filteredPosts.filter(p => 
                    currentUser.followingList?.includes(p.author.username) || p.author.username === currentUser.username
                );
            } else if (activeFilter === 'Media') {
                filteredPosts = filteredPosts.filter(p => !!p.imageUrl || !!p.videoUrl);
            } else if (activeFilter === 'Polls') {
                filteredPosts = filteredPosts.filter(p => !!p.pollOptions && p.pollOptions.length > 0);
            }
        }
        
        const visiblePosts = filteredPosts.filter(p => {
            if (!p.isPrivate) return true;
            if (p.author.username === currentUser.username) return true;
            if (currentUser.followingList?.includes(p.author.username)) return true;
            return false;
        })

        setDisplayedPosts(visiblePosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        
        if (isContextSwitch) {
            const timer = setTimeout(() => setIsLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [selectedDate, searchQuery, allPosts, currentUser, isGenerating, activeFilter, focusPostId]);

    const handleStartEdit = (post: Post) => {
        setPostToEdit(post);
        setIsComposerOpen(true);
    };

    const handlePostSubmit = async (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>, existingPostId?: string) => {
        if (existingPostId) {
            onEditPost(existingPostId, postData);
            setIsComposerOpen(false);
            setPostToEdit(null);
            return;
        }

        // MIGRATION: Sending new post to Backend
        setIsSubmitting(true);
        try {
            const result = await apiClient.createPost(postData);
            
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
    };

    const handleCordSubmit = async () => {
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
    }

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
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
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

    const handleComposerClose = () => {
        setIsComposerOpen(false);
        if (setComposerDate) {
            setComposerDate(null);
        }
    };

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
                <div className="text-center p-10 flex flex-col items-center justify-center space-y-4 h-96">
                   <div className="flex space-x-2 items-end h-10">
                       <div className="w-2 h-4 bg-[var(--theme-primary)] animate-pulse"></div>
                       <div className="w-2 h-8 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                       <div className="w-2 h-6 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                       <div className="w-2 h-10 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.6s'}}></div>
                   </div>
                   <p className="text-[var(--theme-primary)] animate-pulse font-bold tracking-widest">{t('generatingReality')}</p>
               </div>
           );
        }

        if (isLoading) {
            return (
                 <div className="text-center p-10 flex flex-col items-center justify-center space-y-4 h-96">
                    <div className="flex space-x-2 items-end h-10">
                        <div className="w-2 h-4 bg-[var(--theme-primary)] animate-pulse"></div>
                        <div className="w-2 h-8 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-6 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        <div className="w-2 h-10 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                    <p className="text-[var(--theme-primary)] animate-pulse font-bold tracking-widest">{t('loadingEchoes')}</p>
                </div>
            );
        }

        const renderFilterBar = () => (
            <div className="mb-4 flex items-center justify-center space-x-2 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] p-1 rounded-sm">
                {(['All', 'Following', 'Media', 'Polls'] as const).map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1 text-sm font-bold transition-colors w-full rounded-sm ${
                            activeFilter === filter
                                ? 'bg-[var(--theme-primary)] text-white'
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                        }`}
                    >
                        {t(`filter${filter}` as any)}
                    </button>
                ))}
            </div>
        );

        return (
            <>
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
                    displayedPosts.map((post, index) => (
                        <div 
                            id={`post-${post.id}`}
                            key={post.id} 
                            onClick={() => setActivePostId(post.id)}
                            className={`animate-fade-in ${activePostId === post.id ? 'bg-[var(--theme-bg-tertiary)]/30' : ''}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
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
};

export default EchoFrame;