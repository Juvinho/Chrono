import React, { useState, useEffect } from 'react';
import EchoFrame from '../features/timeline/components/EchoFrame';
import { User, Post, CyberpunkReaction, Conversation, Notification } from '../types';
import './styles/feed-content.css';

interface FeedContentProps {
  user: User;
  onNavigate: (page: string, data?: string) => void;
  onNotificationClick: (notification: Notification) => void;
  onViewNotifications: () => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  allUsers: User[];
  allPosts: Post[];
  allKnownPosts?: Post[];
  onNewPost: (post: Post) => void;
  onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
  onReply: (parentId: string, content: string, isPrivate: boolean) => void;
  onEcho: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
  onPollVote: (postId: string, optionIndex: number) => void;
  isGenerating: boolean;
  typingParentIds: Set<string>;
  conversations: Conversation[];
  newPostsCount?: number;
  onShowNewPosts?: () => void;
  onUpdateUser?: (user: User) => Promise<{ success: boolean; error?: string }>;
  onOpenMarketplace?: () => void;
  onOpenChat?: () => void;
  nextAutoRefresh?: Date | null;
  isAutoRefreshPaused?: boolean;
  onBack?: () => void;
  lastViewedNotifications?: Date | null;
  onPostClick?: (postId: string) => void;
}

export const FeedContent: React.FC<FeedContentProps> = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCordTag, setActiveCordTag] = useState<string | null>(null);
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  const [composerDate, setComposerDate] = useState<Date | null>(null);

  const postsForSearch = React.useMemo(() => {
    const source = props.allKnownPosts || props.allPosts;
    return [...source].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [props.allKnownPosts, props.allPosts]);

  const postsForFeed = React.useMemo(() => {
    let source = (activeCordTag || searchQuery) ? postsForSearch : props.allPosts;
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
      filtered = filtered.filter(p => new Date(p.timestamp).toDateString() === props.selectedDate.toDateString());
    }
    return filtered;
  }, [postsForSearch, props.allPosts, activeCordTag, searchQuery, props.selectedDate]);

  const handleTagClick = React.useCallback((tag: string) => {
    const normalized = tag.startsWith('$') ? tag : `$${tag}`;
    setActiveCordTag(normalized);
    setSearchQuery('');
  }, []);

  const handleViewProfile = React.useCallback((username: string) => {
    props.onNavigate('profile', username);
  }, [props]);

  return (
    <div className="feed-content">
      <EchoFrame
        currentUser={props.user}
        posts={postsForFeed}
        allKnownPosts={postsForSearch}
        selectedDate={props.selectedDate}
        onViewProfile={handleViewProfile}
        searchQuery={searchQuery}
        focusPostId={focusPostId}
        onTagClick={handleTagClick}
        onNewPost={props.onNewPost}
        onUpdateReaction={props.onUpdateReaction}
        onReply={props.onReply}
        onEcho={props.onEcho}
        onDeletePost={props.onDeletePost}
        onEditPost={props.onEditPost}
        onPollVote={props.onPollVote}
        isGenerating={props.isGenerating}
        typingParentIds={props.typingParentIds}
        activeCordTag={activeCordTag}
        setActiveCordTag={setActiveCordTag}
        composerDate={composerDate}
        setComposerDate={setComposerDate}
        nextAutoRefresh={props.nextAutoRefresh}
        isAutoRefreshPaused={props.isAutoRefreshPaused}
        onPostClick={props.onPostClick}
      />
    </div>
  );
};
