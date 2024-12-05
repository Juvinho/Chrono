import React, { useMemo, useState } from 'react';
import { Post, User, CyberpunkReaction } from '../types';
import PostCard from './PostCard';
import { useTranslation } from '../hooks/useTranslation';
import GlitchText from './GlitchText';
import { PostComposer } from './PostComposer';

interface CordViewProps {
    cordTag: string;
    onClose: () => void;
    allPosts: Post[];
    currentUser: User;
    onViewProfile: (username: string) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onReply: (parentPostId: string, content: string, isPrivate: boolean) => void;
    onEcho: (postToEcho: Post) => void;
    onDeletePost: (postId: string) => void;
    onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    onTagClick: (tag: string) => void;
    typingParentIds: Set<string>;
    onNewPost: (post: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
}

export default function CordView({
    cordTag,
    onClose,
    allPosts,
    currentUser,
    onViewProfile,
    onUpdateReaction,
    onReply,
    onEcho,
    onDeletePost,
    onEditPost,
    onPollVote,
    onTagClick,
    typingParentIds,
    onNewPost
}: CordViewProps) {
    const { t } = useTranslation();
    const [postToEdit, setPostToEdit] = useState<Post | null>(null);

    // Popular Posts: Sorted by engagement (replies + likes)
    const popularPosts = useMemo(() => {
        return allPosts
            .filter(post => post.content.includes(cordTag))
            .sort((a, b) => {
                 const scoreA = (a.replies?.length || 0) * 2 + Object.values(a.reactions || {}).reduce((sum, v) => sum + v, 0);
                 const scoreB = (b.replies?.length || 0) * 2 + Object.values(b.reactions || {}).reduce((sum, v) => sum + v, 0);
                 return scoreB - scoreA;
            })
            .slice(0, 10);
    }, [allPosts, cordTag]);

    // Recent Posts: Sorted by time (newest first)
    const recentPosts = useMemo(() => {
        return allPosts
            .filter(post => post.content.includes(cordTag))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [allPosts, cordTag]);

    const handlePostSubmit = (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>, existingPostId?: string) => {
        if (existingPostId) {
            onEditPost(existingPostId, postData);
        } else {
            // Automatically append the cord tag if not present
            let content = postData.content;
            if (!content.includes(cordTag)) {
                content = `${content} ${cordTag}`;
            }
            onNewPost({ ...postData, content });
        }
        setPostToEdit(null);
    };

    return (
        <main className="py-8 max-w-7xl mx-auto px-4 cord-view-container">
            {postToEdit && (
                <PostComposer 
                    currentUser={currentUser}
                    onClose={() => setPostToEdit(null)}
                    onSubmit={handlePostSubmit}
                    postToEdit={postToEdit}
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <GlitchText text={`:: CORD :: ${cordTag}`} className="text-2xl font-bold text-[var(--theme-secondary)]" />
                <button onClick={onClose} className="back-to-echo-btn">
                    &lt; {t('backToEchoFrame')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Popular Posts */}
                <div>
                     <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 border-b border-[var(--theme-border-primary)] pb-2">
                        {t('popularCords') || "Cordões Populares"}
                    </h3>
                    <div className="space-y-4 cord-post-list">
                        {popularPosts.length > 0 ? (
                            popularPosts.map(post => (
                                <div key={post.id} className="cord-post-item">
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
                            ))
                        ) : (
                            <div className="text-center text-[var(--theme-text-secondary)] p-10 border border-dashed border-[var(--theme-border-primary)]">
                                <p className="text-lg">{t('noEchoesFoundFor', { query: cordTag })}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Composer + Recent Posts */}
                <div>
                    {/* Post Composer for "Following this Cord" */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-[var(--theme-text-light)] mb-2">Seguir esse cordão</h3>
                        <PostComposer 
                            currentUser={currentUser}
                            onClose={() => {}} 
                            onSubmit={handlePostSubmit}
                            initialContent={`${cordTag} `}
                            inline={true}
                        />
                    </div>

                    <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 border-b border-[var(--theme-border-primary)] pb-2 flex justify-between items-center">
                        <span>{t('recentPosts') || "Posts Recentes"}</span>
                        <span className="text-xs text-[var(--theme-primary)] animate-pulse">● LIVE</span>
                    </h3>
                    <div className="space-y-4 cord-post-list">
                        {recentPosts.map(post => (
                            <div key={post.id} className="cord-post-item">
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