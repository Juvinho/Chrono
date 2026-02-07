import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { User, Page, Post, Conversation } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy load components
const LoginScreen = React.lazy(() => import('../features/auth/components/LoginScreen'));
const Dashboard = React.lazy(() => import('../features/timeline/components/Dashboard'));
const ProfilePage = React.lazy(() => import('../features/profile/components/ProfilePage'));
const SettingsPage = React.lazy(() => import('../features/profile/components/SettingsPage'));
const Welcome = React.lazy(() => import('../features/auth/components/Welcome'));
const Register = React.lazy(() => import('../features/auth/components/Register'));
const Verify = React.lazy(() => import('../features/auth/components/Verify'));
const ForgotPassword = React.lazy(() => import('../features/auth/components/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../features/auth/components/ResetPassword'));
const DataSlicerPage = React.lazy(() => import('../features/analysis/components/DataSlicerPage'));
const MessagesPage = React.lazy(() => import('../features/messaging/components/MessagingLayout').then(m => ({ default: m.MessagingLayout })));
const Marketplace = React.lazy(() => import('../features/marketplace/components/Marketplace'));
const EchoDetailModal = React.lazy(() => import('../features/timeline/components/EchoDetailModal'));
const ThreadView = React.lazy(() => import('../features/timeline/components/ThreadView'));

const RedirectToProfile = () => {
    const { username } = useParams<{ username: string }>();
    return <Navigate to={`/profile/${username}`} replace />;
};

const NotFound = ({ onNavigate }: { onNavigate: (page: Page) => void }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
        <h1 className="text-6xl font-bold text-[var(--theme-primary)] mb-4">404</h1>
        <p className="text-xl mb-8">TIMELINE NOT FOUND</p>
        <button 
            onClick={() => onNavigate(Page.Dashboard)}
            className="px-6 py-3 bg-[var(--theme-bg-secondary)] border border-[var(--theme-primary)] rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
        >
            RETURN TO ECHO FRAME
        </button>
    </div>
);

interface AppRoutesProps {
    currentUser: User | null;
    users: User[];
    setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
    posts: Post[];
    combinedUsers: User[];
    memoizedPosts: Post[];
    memoizedUsers: User[];
    memoizedAllPosts: Post[];
    pendingPosts: Post[];
    
    conversations: Conversation[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    userToVerify: string | null;
    emailToReset: string | null;
    isGenerating: boolean;
    typingParentIds: Set<string>;
    nextAutoRefresh: Date | null;
    isAutoRefreshPaused: boolean;
    
    lastViewedNotifications: Date | null;
    
    // Handlers
    handleNavigate: (page: Page, data?: string) => void;
    handleLogin: (user: User) => void;
    handleLogout: () => void;
    handleNotificationClick: (notification: any) => void;
    onViewNotifications: () => void;
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
    handleFollowToggle: (username: string, actor?: User) => void;
    handleSendGlitchi: (username: string) => void;
    handlePasswordReset: (email: string, pass: string) => void;
    handleOpenThreadView: (postId: string) => void;
}

export default function AppRoutes(props: AppRoutesProps) {
    const {
        currentUser, users, setUsers, combinedUsers, memoizedPosts, memoizedAllPosts, memoizedUsers,
        pendingPosts, conversations, selectedDate, setSelectedDate,
        userToVerify, emailToReset, isGenerating, typingParentIds, nextAutoRefresh, isAutoRefreshPaused,
        lastViewedNotifications,
        handleNavigate, handleLogin, handleLogout, handleNotificationClick, onViewNotifications, handleNewPost,
        handleUpdateReaction, handleReply, handleEcho, handleDeletePost, handleEditPost,
        handlePollVote, handleShowNewPosts, handleUpdateUser,
        setIsMarketplaceOpen, handleBack, handleFollowToggle, handleSendGlitchi, handlePasswordReset, handleOpenThreadView, handleOpenChat
    } = props;

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/welcome" element={!currentUser ? <Welcome onNavigate={handleNavigate} /> : <Navigate to="/echoframe" />} />
            <Route path="/login" element={!currentUser ? <LoginScreen onNavigate={handleNavigate} onLogin={handleLogin} /> : <Navigate to="/echoframe" />} />
            <Route path="/register" element={!currentUser ? <Register users={users} setUsers={setUsers} onNavigate={handleNavigate} onLogin={handleLogin} /> : <Navigate to="/echoframe" />} />
            <Route path="/verify" element={<Verify users={users} setUsers={setUsers} onNavigate={handleNavigate} email={users.find(u => u.username === userToVerify)?.email || null} />} />
            <Route path="/forgot-password" element={<ForgotPassword users={users} onNavigate={handleNavigate} />} />
            <Route path="/reset-password" element={<ResetPassword emailToReset={emailToReset} onPasswordReset={handlePasswordReset} onNavigate={handleNavigate} />} />
            
            {/* Protected Routes */}
            <Route path="/echoframe" element={currentUser ? (
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
                    
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                    onPostClick={handleOpenThreadView}
                />
            ) : <Navigate to="/welcome" />} />

            <Route path="/echo/:dateSegment" element={currentUser ? (
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
                    
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                    onPostClick={handleOpenThreadView}
                />
            ) : <Navigate to="/welcome" />} />

            {/* Rota de Perfil Padrão (/profile/username) */}
            <Route path="/profile/:username" element={currentUser ? (
                <ProfilePage
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
                    onViewNotifications={onViewNotifications}
                    users={memoizedUsers}
                    onFollowToggle={handleFollowToggle}
                    allPosts={memoizedPosts}
                    allUsers={combinedUsers}
                    onUpdateReaction={handleUpdateReaction}
                    onReply={handleReply}
                    onEcho={handleEcho}
                    onDeletePost={handleDeletePost}
                    onEditPost={handleEditPost}
                    onPollVote={handlePollVote}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    typingParentIds={typingParentIds}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    onUpdateUser={handleUpdateUser}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                />
            ) : <Navigate to="/welcome" />} />
            
            {/* Rota de Perfil Estilo Social (/@username) - Mantendo como alias ou redirect */}
            <Route path="/@:username" element={currentUser ? <RedirectToProfile /> : <Navigate to="/welcome" />} />
            
            <Route path="/settings" element={currentUser ? (
                <SettingsPage 
                    user={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
                    onViewNotifications={onViewNotifications}
                    onUpdateUser={handleUpdateUser}
                    allUsers={combinedUsers}
                    allPosts={memoizedPosts}
                    conversations={conversations}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                />
            ) : <Navigate to="/welcome" />} />
            
            <Route path="/data-slicer" element={currentUser ? (
                <DataSlicerPage 
                    user={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
                    onViewNotifications={onViewNotifications}
                    allUsers={combinedUsers}
                    allPosts={memoizedPosts}
                    conversations={conversations}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                />
            ) : <Navigate to="/welcome" />} />
            
            {/* Chat test route removed */}
            
            <Route path="/cordao/:tag" element={currentUser ? (
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
                    
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                    lastViewedNotifications={lastViewedNotifications}
                    onPostClick={handleOpenThreadView}
                />
            ) : <Navigate to="/welcome" />} />

            <Route path="/messages" element={currentUser ? <MessagesPage /> : <Navigate to="/welcome" />} />

            <Route path="/thread/:postId" element={currentUser ? (
                <Suspense fallback={<LoadingSpinner />}>
                    <ThreadView 
                        currentUser={currentUser}
                        allUsers={combinedUsers}
                        allPosts={memoizedPosts}
                        onReply={handleReply}
                        onUpdateReaction={handleUpdateReaction}
                        onEcho={handleEcho}
                        onDeletePost={handleDeletePost}
                        onEditPost={handleEditPost}
                        onPollVote={handlePollVote}
                        onViewProfile={(...args: any[]) => handleNavigate(Page.Profile, args[0])}
                        onBack={handleBack}
                        typingParentIds={typingParentIds}
                    />
                </Suspense>
            ) : <Navigate to="/welcome" />} />

            {/* Redirect root */}
            <Route path="/" element={<Navigate to={currentUser ? "/echoframe" : "/welcome"} replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound onNavigate={handleNavigate} />} />
        </Routes>
    );
}
