import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Page, Post, Conversation } from '../types';

const Dashboard = React.lazy(() => import('../features/timeline/components/Dashboard'));

interface DashboardRouteProps {
    currentUser: User | null;
    combinedUsers: User[];
    memoizedPosts: Post[];
    memoizedAllPosts: Post[];
    memoizedUsers: User[];
    pendingPosts: Post[];
    newPostIds: Set<string>;
    conversations: Conversation[];
    selectedDate: Date;
    typingParentIds: Set<string>;
    nextAutoRefresh: Date | null;
    isAutoRefreshPaused: boolean;
    lastViewedNotifications: Date | null;
    isGenerating: boolean;

    handleNavigate: (page: Page, data?: string) => void;
    handleLogout: () => void;
    handleNotificationClick: (notification: any) => void;
    onViewNotifications: () => void;
    setSelectedDate: (date: Date) => void;
    handleNewPost: (post: Post) => void;
    handleUpdateReaction: (postId: string, reaction: any, actor?: User) => void;
    handleReply: (parentId: string, content: string, isPrivate: boolean, media?: any, actor?: User) => void;
    handleEcho: (post: Post, actor?: User) => void;
    handleDeletePost: (postId: string) => void;
    handleEditPost: (postId: string, data: any) => void;
    handlePollVote: (postId: string, optionIndex: number, actor?: User) => void;
    handleShowNewPosts: () => void;
    handleUpdateUser: (user: User) => Promise<{ success: boolean; error?: string }>;
    setIsMarketplaceOpen: (val: boolean) => void;
    handleBack: () => void;
    handleOpenChat: () => void;
    handleOpenThreadView: (postId: string) => void;
}

/**
 * DRY wrapper component for Dashboard routes
 * Reduces duplicate code across /echoframe, /echoframe/:dateSegment, /echo/:dateSegment
 * (I-09: Dashboard duplication removal)
 */
export const DashboardRoute: React.FC<DashboardRouteProps> = ({
    currentUser,
    combinedUsers,
    memoizedPosts,
    memoizedAllPosts,
    memoizedUsers,
    pendingPosts,
    newPostIds,
    conversations,
    selectedDate,
    typingParentIds,
    nextAutoRefresh,
    isAutoRefreshPaused,
    lastViewedNotifications,
    isGenerating,
    handleNavigate,
    handleLogout,
    handleNotificationClick,
    onViewNotifications,
    setSelectedDate,
    handleNewPost,
    handleUpdateReaction,
    handleReply,
    handleEcho,
    handleDeletePost,
    handleEditPost,
    handlePollVote,
    handleShowNewPosts,
    handleUpdateUser,
    setIsMarketplaceOpen,
    handleBack,
    handleOpenChat,
    handleOpenThreadView,
}) => {
    if (!currentUser) {
        return <Navigate to="/welcome" />;
    }

    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <Dashboard
                user={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onNotificationClick={handleNotificationClick}
                onViewNotifications={onViewNotifications}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                allUsers={combinedUsers}
                allPosts={memoizedPosts}
                allKnownPosts={memoizedAllPosts}
                onNewPost={handleNewPost}
                onUpdateReaction={handleUpdateReaction}
                onReply={handleReply}
                onEcho={handleEcho}
                onDeletePost={handleDeletePost}
                onEditPost={handleEditPost}
                onPollVote={handlePollVote}
                isGenerating={isGenerating}
                typingParentIds={typingParentIds}
                conversations={conversations}
                newPostsCount={pendingPosts.length}
                onShowNewPosts={handleShowNewPosts}
                newPostIds={newPostIds}
                onUpdateUser={handleUpdateUser}
                onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                nextAutoRefresh={nextAutoRefresh}
                isAutoRefreshPaused={isAutoRefreshPaused}
                onBack={handleBack}
                lastViewedNotifications={lastViewedNotifications}
                onPostClick={handleOpenThreadView}
                onOpenChat={handleOpenChat}
            />
        </Suspense>
    );
};
