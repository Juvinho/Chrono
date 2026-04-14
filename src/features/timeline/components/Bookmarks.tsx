import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post, User, CyberpunkReaction, Page } from '../../../types/index';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';
import { BookmarkIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { postService } from '../../../api/post.service';
import { mapApiPostToPost } from '../../../api/mappers';
import { useToast } from '../../../contexts/ToastContext';
import '../../../styles/post-glitch-animation.css';

interface BookmarksProps {
    currentUser: User;
    allPosts: Post[];
    onViewProfile: (username: string) => void;
    onTagClick: (tag: string) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onReply: (parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }) => void;
    onEcho: (postToEcho: Post) => void;
    onDeletePost: (postId: string) => void;
    onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    typingParentIds: Set<string>;
    onNavigate: (page: Page, data?: string) => void;
}

const EmptyState: React.FC = () => {
    const { t } = useTranslation();
    
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4 opacity-50">
                <BookmarkIcon className="w-20 h-20 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--theme-text-light)] mb-2">
                {t('noBookmarks') || 'Nenhum post salvo ainda'}
            </h2>
            <p className="text-[var(--theme-text-secondary)] max-w-md">
                {t('noBookmarksDesc') || 'Quando você salvar um post, ele aparecerá aqui.'}
            </p>
        </div>
    );
};

export default function Bookmarks({
    currentUser,
    allPosts,
    onViewProfile,
    onTagClick,
    onUpdateReaction,
    onReply,
    onEcho,
    onDeletePost,
    onEditPost,
    onPollVote,
    typingParentIds,
    onNavigate
}: BookmarksProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    // Load bookmarks on mount
    useEffect(() => {
        const loadBookmarks = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await postService.getBookmarks({ limit: 100 });
                if (response.data) {
                    // Backend returns { bookmarks, limit, offset, hasMore }
                    const bookmarksArray = response.data.bookmarks || response.data;
                    if (Array.isArray(bookmarksArray)) {
                        const mapped = bookmarksArray.map(mapApiPostToPost);
                        setBookmarkedPosts(mapped);
                        setBookmarkedIds(new Set(mapped.map((p: any) => p.id)));
                    } else {
                        throw new Error('Invalid bookmarks data format');
                    }
                } else if (response.error) {
                    throw new Error(response.error.message || 'Erro desconhecido ao carregar bookmarks');
                } else {
                    throw new Error('No data received from server');
                }
            } catch (err: any) {
                console.error('Failed to load bookmarks:', err);
                const errorMessage = err?.message || 'Erro ao carregar bookmarks';
                setError(errorMessage);
                setBookmarkedPosts([]);
                setBookmarkedIds(new Set());
                showToast(errorMessage, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadBookmarks();
    }, [showToast]);

    // Handle bookmark toggle
    const handleBookmark = React.useCallback(async (postId: string) => {
        const isCurrentlyBookmarked = bookmarkedIds.has(postId);
        
        // Optimistic update
        setBookmarkedIds(prev => {
            const next = new Set(prev);
            if (isCurrentlyBookmarked) {
                next.delete(postId);
            } else {
                next.add(postId);
            }
            return next;
        });

        // Remove from list if unbookmarking
        if (isCurrentlyBookmarked) {
            setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
        }

        try {
            if (isCurrentlyBookmarked) {
                await postService.removeBookmark(postId);
                showToast('Bookmark removido', 'info');
            } else {
                await postService.bookmarkPost(postId);
                showToast('Post salvo!', 'success');
            }
        } catch (error) {
            // Revert on failure
            setBookmarkedIds(prev => {
                const next = new Set(prev);
                if (isCurrentlyBookmarked) {
                    next.add(postId);
                } else {
                    next.delete(postId);
                }
                return next;
            });
            
            // Re-add to list if unbookmarking failed
            if (isCurrentlyBookmarked) {
                const post = allPosts.find(p => p.id === postId);
                if (post) {
                    setBookmarkedPosts(prev => [...prev, post]);
                }
            }
            
            showToast('Erro ao atualizar bookmark', 'error');
        }
    }, [bookmarkedIds, allPosts, showToast]);

    // Sort bookmarked posts by most recently saved first
    const sortedBookmarks = useMemo(() => {
        return [...bookmarkedPosts].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
    }, [bookmarkedPosts]);

    return (
        <div className="w-full h-full flex flex-col bg-[var(--theme-bg-primary)]">
            {/* Header */}
            <div className="sticky top-0 z-30 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]/95 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-4 py-4">
                    <BookmarkIcon className="w-6 h-6 text-[var(--theme-primary)]" />
                    <h1 className="text-xl font-bold text-[var(--theme-text-light)]">
                        {t('bookmarks') || '🔖 Posts Salvos'}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {error ? (
                    // Error state
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="text-6xl mb-4 opacity-50">⚠️</div>
                        <h2 className="text-2xl font-bold text-[var(--theme-text-light)] mb-2">
                            Erro ao carregar bookmarks
                        </h2>
                        <p className="text-[var(--theme-text-secondary)] max-w-md mb-6">
                            {error}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-sm hover:opacity-90 transition-opacity"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : isLoading ? (
                    // Loading state
                    <div className="divide-y divide-[var(--theme-border-primary)]">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <PostSkeleton key={i} />
                        ))}
                    </div>
                ) : sortedBookmarks.length === 0 ? (
                    // Empty state
                    <EmptyState />
                ) : (
                    // Posts list
                    <div className="divide-y divide-[var(--theme-border-primary)]">
                        {sortedBookmarks.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUser={currentUser}
                                onViewProfile={onViewProfile}
                                onUpdateReaction={onUpdateReaction}
                                onReply={onReply}
                                onEcho={onEcho}
                                onDelete={onDeletePost}
                                onEdit={onEditPost}
                                onTagClick={onTagClick}
                                onPollVote={onPollVote}
                                onBookmark={handleBookmark}
                                onReport={() => {
                                    // TODO: Implement report
                                }}
                                isBookmarked={bookmarkedIds.has(post.id)}
                                typingParentIds={typingParentIds}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
