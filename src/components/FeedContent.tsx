import React from 'react';
import Dashboard from '../features/timeline/components/Dashboard';
import { User, Page, Post, CyberpunkReaction, Conversation, Notification } from '../types';
import './styles/feed-content.css';

/**
 * A-07: FeedContent Wrapper Component
 * 
 * Not redundant - serves specific purposes:
 * 1. Provides styling context for split-view layout (feed occupies 50% of screen)
 * 2. Customizes scrollbar appearance (feed-content.css)
 * 3. Manages overflow behavior for Dashboard integration
 * 4. Responsive wrapper for potential mobile-specific changes
 * 
 * CSS: src/components/styles/feed-content.css (48 lines)
 * - Sets height/width to 100% of parent container
 * - Custom scrollbar styling (webkit)
 * - Dark mode scrollbar adjustments
 * 
 * Assessment: KEEP - Valid separation of concerns with active styling
 */
  user: User;
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
