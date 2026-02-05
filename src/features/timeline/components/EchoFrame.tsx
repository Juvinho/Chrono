import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Post, User, CyberpunkReaction } from '../../../types/index';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';
import { PostComposer } from './PostComposer';
import { isSameDay } from '../../../utils/date';
import { PlusIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
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
    nextAutoRefresh?: Date | null;
    isAutoRefreshPaused?: boolean;
}

export default function EchoFrame({ 
    selectedDate, currentUser, posts: allPosts, onViewProfile, onTagClick, 
    onNewPost, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost, onPollVote, searchQuery, focusPostId, isGenerating,
    typingParentIds, activeCordTag, setActiveCordTag, composerDate, setComposerDate, allKnownPosts,
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
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        if (composerDate) {
            setIsComposerOpen(true);
        }
    }, [composerDate]);

    useEffect(() => {
        const convId = sessionStorage.getItem('chrono_open_conversation_id');
        const convUser = sessionStorage.getItem('chrono_open_conversation_username');
        if (!convId && !convUser) return;
        setIsChatLoading(true);
        const open = async () => {
            try {
                let id = convId;
                if (!id && convUser) {
                    const res = await apiClient.getOrCreateConversation(convUser);
                    id = res.data?.id || res.data?.conversationId;
                }
                if (!id) {
                    setIsChatLoading(false);
                    return;
                }
                setActiveConversationId(id);
                const msgs = await apiClient.getMessages(id);
                setChatMessages(msgs.data || []);
            } finally {
                setIsChatLoading(false);
                sessionStorage.removeItem('chrono_open_conversation_id');
                sessionStorage.removeItem('chrono_open_conversation_username');
            }
        };
        open();
    }, []);

    const handleSendChat = useCallback(async () => {
        if (!activeConversationId || !chatInput.trim()) return;
        const optimistic = {
            id: `tmp-${Date.now()}`,
            sender_id: currentUser.id,
            text: chatInput,
            created_at: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, optimistic]);
        setChatInput('');
        const res = await apiClient.sendMessage(activeConversationId, optimistic.text);
        if (res.error) {
            setChatMessages(prev => prev.filter(m => m.id !== optimistic.id));
            return;
        }
        const real = res.data!;
        setChatMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
    }, [activeConversationId, chatInput, currentUser.id]);

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

    const handleComposerClose = useCallback(() => {
        setIsComposerOpen(false);
        if (setComposerDate) {
            setComposerDate(null);
        }
    }, [setComposerDate]);

    if (activeCordTag) {
        const cordTagLower = activeCordTag.toLowerCase();
        const cordPopular = allPosts
            .filter(p => p.content.toLowerCase().includes(cordTagLower))
            .sort((a, b) => {
                const scoreA = (a.replies?.length || 0) * 2 + Object.values(a.reactions || {}).reduce((sum, v) => sum + v, 0);
                const scoreB = (b.replies?.length || 0) * 2 + Object.values(b.reactions || {}).reduce((sum, v) => sum + v, 0);
                return scoreB - scoreA;
            })
            .slice(0, 10);
        const cordRecent = allPosts
            .filter(p => p.content.toLowerCase().includes(cordTagLower))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const handleCordPostSubmit = (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>, existingPostId?: string) => {
            const withTag = postData.content.includes(activeCordTag) ? postData : { ...postData, content: `${postData.content} ${activeCordTag}` };
            handlePostSubmit(withTag, existingPostId);
        };

        return (
            <main className="py-8 max-w-7xl mx-auto px-4">
                {postToEdit && (
                    <PostComposer 
                        currentUser={currentUser}
                        onClose={() => setPostToEdit(null)}
                        onSubmit={handleCordPostSubmit}
                        postToEdit={postToEdit}
                    />
                )}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--theme-secondary)]">:: CORD :: {activeCordTag}</h2>
                    <button onClick={() => setActiveCordTag(null)} className="back-to-echo-btn">&lt; {t('backToEchoFrame') || 'Voltar'}</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 border-b border-[var(--theme-border-primary)] pb-2">
                            {t('popularCords') || 'Cordões Populares'}
                        </h3>
                        <div className="space-y-4">
                            {cordPopular.length > 0 ? cordPopular.map(post => (
                                <div key={post.id}>
                                    <PostCard
                                        post={post}
                                        currentUser={currentUser}
                                        onViewProfile={onViewProfile}
                                        onUpdateReaction={onUpdateReaction}
                                        onReply={onReply}
                                        onEcho={onEcho}
                                        onDelete={onDeletePost}
                                        onEdit={setPostToEdit}
                                        onTagClick={onTagClick}
                                        onPollVote={onPollVote}
                                        typingParentIds={typingParentIds}
                                    />
                                </div>
                            )) : (
                                <div className="text-center text-[var(--theme-text-secondary)] p-10 border border-dashed border-[var(--theme-border-primary)]">
                                    <p className="text-lg">{t('noEchoesFoundFor', { query: activeCordTag })}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-[var(--theme-text-light)] mb-2">{t('createCord') || 'Criar Cordão'}</h3>
                            <PostComposer 
                                currentUser={currentUser}
                                onClose={() => {}}
                                onSubmit={handleCordPostSubmit}
                                initialContent={`${activeCordTag} `}
                                inline={true}
                            />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 border-b border-[var(--theme-border-primary)] pb-2 flex justify-between items-center">
                            <span>{t('recentPosts') || 'Posts Recentes'}</span>
                            <span className="text-xs text-[var(--theme-primary)] animate-pulse">● LIVE</span>
                        </h3>
                        <div className="space-y-4">
                            {cordRecent.map(post => (
                                <div key={post.id}>
                                    <PostCard
                                        post={post}
                                        currentUser={currentUser}
                                        onViewProfile={onViewProfile}
                                        onUpdateReaction={onUpdateReaction}
                                        onReply={onReply}
                                        onEcho={onEcho}
                                        onDelete={onDeletePost}
                                        onEdit={setPostToEdit}
                                        onTagClick={onTagClick}
                                        onPollVote={onPollVote}
                                        typingParentIds={typingParentIds}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const renderMobileHeader = () => (
        <div className="lg:hidden mb-6 space-y-4">
            {/* Mobile header content without stories */}
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
                        {(() => {
                            const avatarShape = currentUser.equippedFrame ? getFrameShape(currentUser.equippedFrame.name) : 'rounded-full';
                            return (
                                <div className="relative w-10 h-10 flex-shrink-0">
                                    <img src={currentUser.avatar || 'https://via.placeholder.com/150'} alt={currentUser.username} className={`w-full h-full ${avatarShape} object-cover`} />
                                    {currentUser.equippedEffect && (
                                        <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                            <img 
                                                src={currentUser.equippedEffect.imageUrl} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    {currentUser.equippedFrame && (
                                        <div className="absolute -inset-1 z-20 pointer-events-none">
                                            <FramePreview item={currentUser.equippedFrame} />
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
                </aside>
                
                {/* Center Column: Main Feed */}
                <section className="lg:col-span-2">
                    {renderMobileHeader()}
                    {renderCenterColumn()}
                </section>

                {/* Right Column: Cord Hub */}
                <aside className="hidden lg:block">
                     <div className="mb-6 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
                         <div className="flex items-center justify-between mb-3">
                             <h2 className="text-lg font-bold text-[var(--theme-text-light)]">:: Direct Chat</h2>
                             {activeConversationId && (
                                <button onClick={() => { setActiveConversationId(null); setChatMessages([]); }} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]">
                                    {t('close') || 'Fechar'}
                                </button>
                             )}
                         </div>
                         {isChatLoading ? (
                            <div className="text-[var(--theme-text-secondary)]">{t('loading') || 'Carregando...'}</div>
                         ) : activeConversationId ? (
                            <>
                                <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto pr-2">
                                    {chatMessages.map(m => (
                                        <div key={m.id} className={`p-2 rounded border border-[var(--theme-border-primary)] ${m.sender_id === currentUser.id ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}>
                                            <div className="text-xs text-[var(--theme-text-secondary)] mb-1">
                                                {new Date(m.created_at).toLocaleString()}
                                            </div>
                                            <div className="text-sm">{m.text}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        value={chatInput} 
                                        onChange={(e) => setChatInput(e.target.value)} 
                                        placeholder={t('typeMessage') || 'Digite uma mensagem...'} 
                                        className="flex-1 px-3 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded"
                                    />
                                    <button 
                                        onClick={handleSendChat}
                                        className="px-4 py-2 bg-[var(--theme-primary)] text-black rounded hover:opacity-80"
                                    >
                                        {t('send') || 'Enviar'}
                                    </button>
                                </div>
                            </>
                         ) : (
                            <div className="text-[var(--theme-text-secondary)]">{t('selectConversation') || 'Selecione uma conversa para começar'}</div>
                         )}
                     </div>
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
