import React from 'react';
import Timeline from '../features/timeline/components/Timeline';
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
  return (
    <div className="feed-content">
      <Timeline
        user={props.user}
        onNavigate={props.onNavigate}
        onNotificationClick={props.onNotificationClick}
        onViewNotifications={props.onViewNotifications}
        selectedDate={props.selectedDate}
        setSelectedDate={props.setSelectedDate}
        allUsers={props.allUsers}
        allPosts={props.allPosts}
        onNewPost={props.onNewPost}
        onUpdateReaction={props.onUpdateReaction}
        onReply={props.onReply}
        onEcho={props.onEcho}
        onDeletePost={props.onDeletePost}
        onEditPost={props.onEditPost}
        onPollVote={props.onPollVote}
        isGenerating={props.isGenerating}
        typingParentIds={props.typingParentIds}
        conversations={props.conversations}
        newPostsCount={props.newPostsCount || 0}
        onShowNewPosts={props.onShowNewPosts}
        allKnownPosts={props.allKnownPosts}
        onUpdateUser={props.onUpdateUser}
        onOpenMarketplace={props.onOpenMarketplace}
        onOpenChat={props.onOpenChat}
        nextAutoRefresh={props.nextAutoRefresh}
        isAutoRefreshPaused={props.isAutoRefreshPaused}
        onBack={props.onBack}
        lastViewedNotifications={props.lastViewedNotifications}
        onPostClick={props.onPostClick}
      />
    </div>
  );
};
