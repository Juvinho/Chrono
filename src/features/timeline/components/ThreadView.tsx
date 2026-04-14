import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, User, CyberpunkReaction } from '../../../types/index';
import { apiClient } from '../../../api';
import { mapApiPostToPost } from '../../../api/mappers';
import PostCard from './PostCard';
import { ChevronLeftIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';

interface ThreadViewProps {
    currentUser: User;
    allUsers: User[];
    allPosts: Post[];
    onReply: (parentId: string, content: string, isPrivate: boolean, media?: any) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onEcho: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    onEditPost: (postId: string, data: any) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    onViewProfile: (username: string) => void;
    onBack: () => void;
    typingParentIds: Set<string>;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
    currentUser,
    allUsers,
    allPosts,
    onReply,
    onUpdateReaction,
    onEcho,
    onDeletePost,
    onEditPost,
    onPollVote,
    onViewProfile,
    onBack,
    typingParentIds,
}) => {
    const { t } = useTranslation();
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    
    // Try to find the post in allPosts first to avoid flicker
    const postFromAllPosts = allPosts.find(p => p.id === postId);
    const [rootPost, setRootPost] = useState<Post | null>(postFromAllPosts || null);
    const [loading, setLoading] = useState(!postFromAllPosts);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPost = async () => {
            if (!postId) {
                setError('Post ID not provided');
                setLoading(false);
                return;
            }

            // If we already have the post, don't fetch again
            if (rootPost) {
                setLoading(false);
                return;
            }

            try {
                setError(null);
                
                const response = await apiClient.getPost(postId);
                if (response.error) {
                    setError(response.error);
                    setLoading(false);
                    return;
                }

                const mappedPost = mapApiPostToPost(response.data || response);
                setRootPost(mappedPost);
                setLoading(false);
            } catch (err: any) {
                console.error('Failed to load thread:', err);
                setError(err.message || 'Failed to load thread');
                setLoading(false);
            }
        };

        loadPost();
    }, [postId]);

    if (loading) {
        return null;
    }

    if (error || !rootPost) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)'
            }}>
                <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-6 max-w-600px text-center">
                    <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary)]">{t('threadNotFound')}</h2>
                    <p className="text-[var(--theme-text-secondary)] mb-6">{error || t('threadDoesNotExist')}</p>
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center gap-2 px-4 py-2 mx-auto bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm hover:bg-[var(--theme-bg-secondary)] transition-colors"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        {t('goBack')}
                    </button>
                </div>
            </div>
        );
    }

    const handleRenderReplies = (post: Post, depth: number = 0): React.ReactNode[] => {
        const result: React.ReactNode[] = [];

        // Render current post
        result.push(
            <div key={`post-${post.id}`} className={depth === 0 ? '' : ''}>
                <PostCard
                    post={post}
                    currentUser={currentUser}
                    onViewProfile={onViewProfile}
                    onUpdateReaction={onUpdateReaction}
                    onReply={onReply}
                    onEcho={onEcho}
                    onDelete={onDeletePost}
                    onEdit={(post) => onEditPost(post.id, post)}
                    onTagClick={() => {}}
                    onPollVote={onPollVote}
                    typingParentIds={typingParentIds}
                    nestingLevel={depth}
                    isThreadedReply={depth > 0}
                    isContextualView={true}
                />
            </div>
        );

        // Render replies
        if (post.replies && post.replies.length > 0) {
            result.push(
                <div key={`replies-${post.id}`} className="mt-4 space-y-0 border-l-2 border-[var(--theme-border-primary)] pl-4 md:pl-6">
                    {post.replies.map((reply) => (
                        <div key={`reply-container-${reply.id}`}>
                            {handleRenderReplies(reply, depth + 1)}
                        </div>
                    ))}
                </div>
            );
        }

        return result;
    };

    return (
        <div
            className="min-h-screen flex items-flex-start justify-center p-4 md:p-8 overflow-y-auto"
            style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                paddingTop: '2rem',
            }}
        >
            {/* Card Container */}
            <div
                className="w-full max-w-600px bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-lg overflow-hidden"
                style={{ boxSizing: 'border-box' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 p-6 border-b border-[var(--theme-border-primary)]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center w-9 h-9 rounded-sm text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                            title={t('goBack')}
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold text-[var(--theme-text-light)]">{t('thread') || 'THREAD'}</h1>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-0 max-h-[70vh] overflow-y-auto">
                    {/* Original Post */}
                    <div className="pb-4 border-b border-[var(--theme-border-primary)]">
                        {handleRenderReplies(rootPost)[0]}
                    </div>

                    {/* Replies Section */}
                    {rootPost.replies && rootPost.replies.length > 0 ? (
                        <div className="mt-4 space-y-0">
                            <h3 className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider mb-4 px-2">
                                {t('replies') || 'Respostas'} ({rootPost.replies.length})
                            </h3>
                            <div className="space-y-0">
                                {handleRenderReplies(rootPost).slice(1)}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 py-8 text-center">
                            <p className="text-[var(--theme-text-secondary)] text-sm">
                                {t('noReplies') || 'Nenhuma resposta ainda. Seja o primeiro!'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer - Reply Button */}
                <div className="p-6 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                    <button
                        onClick={() => onReply(rootPost.id, '', false)}
                        className="w-full py-2 px-4 text-sm font-medium text-[var(--theme-primary)] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-sm hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-primary)] transition-colors"
                    >
                        + {t('reply') || 'Responder'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThreadView;
