import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, User, CyberpunkReaction } from '../../../types/index';
import { apiClient } from '../../../api';
import { mapApiPostToPost } from '../../../api/mappers';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import PostCard from './PostCard';
import { ChevronLeftIcon } from '../../../components/ui/icons';

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
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [rootPost, setRootPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPost = async () => {
            if (!postId) {
                setError('Post ID not provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const response = await apiClient.getPost(postId);
                if (response.error) {
                    setError(response.error);
                    return;
                }

                const mappedPost = mapApiPostToPost(response.data || response);
                setRootPost(mappedPost);
            } catch (err: any) {
                console.error('Failed to load thread:', err);
                setError(err.message || 'Failed to load thread');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [postId]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !rootPost) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
                <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary)]">THREAD NOT FOUND</h2>
                <p className="text-[var(--theme-text-secondary)] mb-6">{error || 'This thread does not exist'}</p>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-primary)] rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    GO BACK
                </button>
            </div>
        );
    }

    const handleRenderReplies = (post: Post, depth: number = 0): React.ReactNode[] => {
        const result: React.ReactNode[] = [];

        // Render current post
        result.push(
            <div
                key={`post-${post.id}`}
                className={`${
                    depth === 0 ? 'border-b-2 border-[var(--theme-primary)]' : ''
                } pb-4 mb-4`}
            >
                <PostCard
                    post={post}
                    currentUser={currentUser}
                    onViewProfile={onViewProfile}
                    onUpdateReaction={onUpdateReaction}
                    onReply={onReply}
                    onEcho={onEcho}
                    onDelete={onDeletePost}
                    onEdit={onEditPost}
                    onTagClick={() => {}}
                    onPollVote={onPollVote}
                    typingParentIds={typingParentIds}
                    nestingLevel={depth}
                    isThreadedReply={depth > 0}
                />
            </div>
        );

        // Render replies
        if (post.replies && post.replies.length > 0) {
            result.push(
                <div key={`replies-${post.id}`} className="ml-0 md:ml-4 border-l-2 border-[var(--theme-primary)] pl-4">
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
        <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[var(--theme-bg-primary)] border-b-2 border-[var(--theme-primary)]">
                <div className="flex items-center gap-4 p-4 max-w-4xl mx-auto">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-10 h-10 rounded hover:bg-[var(--theme-bg-secondary)] transition-colors"
                        title="Go back"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">THREAD</h1>
                </div>
            </div>

            {/* Thread Content */}
            <div className="max-w-4xl mx-auto p-4">
                <div className="space-y-0">
                    {handleRenderReplies(rootPost)}
                </div>
            </div>
        </div>
    );
};

export default ThreadView;
