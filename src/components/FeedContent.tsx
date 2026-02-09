import React, { useState, useEffect } from 'react';
import Dashboard from '../features/timeline/components/Dashboard';
import { User, Page, Post, CyberpunkReaction, Conversation, Notification } from '../types';
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
  newPostIds?: Set<string>;
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
      <Dashboard
        user={props.user}
        onLogout={() => {}}
        onNavigate={props.onNavigate}
        onNotificationClick={props.onNotificationClick}
        onViewNotifications={props.onViewNotifications}
        selectedDate={props.selectedDate}
        setSelectedDate={props.setSelectedDate}
        allUsers={props.allUsers}
        allPosts={props.allPosts}
        allKnownPosts={props.allKnownPosts}
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
        newPostIds={props.newPostIds || new Set()}
        newPostsCount={props.newPostsCount}
        onShowNewPosts={props.onShowNewPosts}
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
