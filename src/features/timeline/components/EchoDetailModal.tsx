
import React, { useEffect, useState } from 'react';
import { Post, User } from '../types';
import { apiClient, mapApiPostToPost } from '../services/api';
import PostCard from './PostCard';
import { useTranslation } from '../hooks/useTranslation';

interface EchoDetailModalProps {
    postId: string;
    onClose: () => void;
    currentUser: User;
    onReply: (parentPostId: string, content: string, isPrivate: boolean, media?: any) => void;
    onEcho: (post: Post) => void;
    onReaction: (postId: string, reaction: any) => void;
}

export default function EchoDetailModal({ postId, onClose, currentUser, onReply, onEcho, onReaction }: EchoDetailModalProps) {
    const { t } = useTranslation();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                const response = await apiClient.getPost(postId);
                if (response.data) {
                    setPost(mapApiPostToPost(response.data));
                } else {
                    setError('Post not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load post');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId]);

    if (!postId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[var(--theme-bg-secondary)] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-[var(--theme-border-primary)] shadow-2xl relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)] z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-10">{error}</div>
                    ) : post ? (
                        <div className="space-y-6">
                            {/* Main Post */}
                            <div className="border-b border-[var(--theme-border-primary)] pb-6">
                                <PostCard 
                                    post={post} 
                                    currentUser={currentUser}
                                    onReply={onReply}
                                    onEcho={onEcho}
                                    onUpdateReaction={onReaction}
                                    isDetailView={true}
                                />
                            </div>

                            {/* Replies / Thread */}
                            {post.replies && post.replies.length > 0 && (
                                <div className="space-y-4 pl-4 border-l-2 border-[var(--theme-border-primary)]">
                                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider mb-4">
                                        {t('comments') || 'Comments'}
                                    </h3>
                                    {post.replies.map(reply => (
                                        <div key={reply.id} className="relative">
                                            <PostCard 
                                                post={reply} 
                                                currentUser={currentUser}
                                                onReply={onReply}
                                                onEcho={onEcho}
                                                onUpdateReaction={onReaction}
                                            />
                                            {/* Nested replies (level 2) */}
                                            {reply.replies && reply.replies.length > 0 && (
                                                <div className="mt-4 ml-6 space-y-4 pl-4 border-l border-[var(--theme-border-secondary)]">
                                                     {reply.replies.map(subReply => (
                                                        <PostCard 
                                                            key={subReply.id}
                                                            post={subReply} 
                                                            currentUser={currentUser}
                                                            onReply={onReply}
                                                            onEcho={onEcho}
                                                            onUpdateReaction={onReaction}
                                                        />
                                                     ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
