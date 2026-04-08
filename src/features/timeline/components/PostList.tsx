import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PostCard from './PostCard';
import { Post, User, CyberpunkReaction, Notification } from '../../../types/index';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

interface PostListProps {
  posts: Post[];
  currentUser: User;
  onViewProfile: (username: string) => void;
  onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
  onReply: (parentId: string, content: string, isPrivate: boolean, media?: any) => void;
  onEcho: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
  onPollVote: (postId: string, optionIndex: number) => void;
  typingParentIds?: Set<string>;
  onLoadMore?: () => Promise<void> | void;
  hasMore?: boolean;
  isLoading?: boolean;
  compact?: boolean;
  nestingLevel?: number;
  onTagClick?: (tag: string) => void;
  onPostClick?: (postId: string) => void;
}

/**
 * PostList Component with Infinite Scroll
 * P-05: Implements Intersection Observer-based pagination
 * Automatically loads more posts when user scrolls to bottom
 */
export const PostList: React.FC<PostListProps> = ({
  posts,
  currentUser,
  onViewProfile,
  onUpdateReaction,
  onReply,
  onEcho,
  onDeletePost,
  onEditPost,
  onPollVote,
  typingParentIds = new Set(),
  onLoadMore,
  hasMore = false,
  isLoading = false,
  compact = false,
  nestingLevel = 0,
  onTagClick,
  onPostClick,
}) => {
  const { observerTarget } = useInfiniteScroll({
    onLoadMore: onLoadMore || (() => {}),
    hasMore,
    isLoading,
    threshold: 0.5,
  });

  // Memoize sorted posts to avoid unnecessary re-renders
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [posts]);

  return (
    <div className="space-y-4">
      {sortedPosts.length === 0 && !isLoading && (
        <div className="text-center py-8 text-[var(--theme-text-secondary)]">
          <p>No posts yet. Start sharing!</p>
        </div>
      )}

      {sortedPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onViewProfile={onViewProfile}
          onUpdateReaction={onUpdateReaction}
          onReply={onReply}
          onEcho={onEcho}
          onDelete={onDeletePost}
          onEdit={(postToEdit) => {
            // Edit handler: would normally open an edit modal
            // For now, this is handled by the parent component
            console.log('Edit post:', postToEdit.id);
          }}
          onTagClick={onTagClick || (() => {})}
          onPollVote={onPollVote}
          typingParentIds={typingParentIds}
          compact={compact}
          nestingLevel={nestingLevel}
          onPostClick={onPostClick}
        />
      ))}

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-8">
          {isLoading && <LoadingSpinner />}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-[var(--theme-text-secondary)] text-sm">
          <p>No more posts</p>
        </div>
      )}
    </div>
  );
};

export default PostList;
