import React from 'react';
import { User, Page, Post, CyberpunkReaction, Notification, Conversation } from '../../../types';
import Dashboard from '../../timeline/components/Dashboard';
import { MessagingLayout } from './MessagingLayout';
import '../styles/messages-split-view.css';

interface MessagesSplitViewProps {
  // Dashboard props
  currentUser: User;
  onLogout: () => void;
  onNavigate: (page: Page, data?: string) => void;
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

export const MessagesSplitView: React.FC<MessagesSplitViewProps> = ({
  currentUser,
  onLogout,
  onNavigate,
  onNotificationClick,
  onViewNotifications,
  selectedDate,
  setSelectedDate,
  allUsers,
  allPosts,
  allKnownPosts,
  onNewPost,
  onUpdateReaction,
  onReply,
  onEcho,
  onDeletePost,
  onEditPost,
  onPollVote,
  isGenerating,
  typingParentIds,
  conversations,
  newPostsCount,
  onShowNewPosts,
  onUpdateUser,
  onOpenMarketplace,
  onOpenChat,
  nextAutoRefresh,
  isAutoRefreshPaused,
  onBack,
  lastViewedNotifications,
  onPostClick,
}) => {
  return (
    <div className="messages-split-view">
      {/* LEFT: Timeline/Feed */}
      <div className="messages-split-left">
        <div className="messages-split-dashboard">
          <Dashboard
            user={currentUser}
            onLogout={onLogout}
            onNavigate={onNavigate}
            onNotificationClick={onNotificationClick}
            onViewNotifications={onViewNotifications}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            allUsers={allUsers}
            allPosts={allPosts}
            allKnownPosts={allKnownPosts}
            onNewPost={onNewPost}
            onUpdateReaction={onUpdateReaction}
            onReply={onReply}
            onEcho={onEcho}
            onDeletePost={onDeletePost}
            onEditPost={onEditPost}
            onPollVote={onPollVote}
            isGenerating={isGenerating}
            typingParentIds={typingParentIds}
            conversations={conversations}
            newPostsCount={newPostsCount}
            onShowNewPosts={onShowNewPosts}
            onUpdateUser={onUpdateUser}
            onOpenMarketplace={onOpenMarketplace}
            onOpenChat={onOpenChat}
            nextAutoRefresh={nextAutoRefresh}
            isAutoRefreshPaused={isAutoRefreshPaused}
            onBack={onBack}
            lastViewedNotifications={lastViewedNotifications}
            onPostClick={onPostClick}
          />
        </div>
      </div>

      {/* RIGHT: Messages */}
      <div className="messages-split-right">
        <MessagingLayout />
      </div>
    </div>
  );
};
