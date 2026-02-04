import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { User, Page, Post, Story, Conversation } from '../types';
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
const ChatTest = React.lazy(() => import('../features/messages/components/ChatTest'));
const MessagesPage = React.lazy(() => import('../features/messages/components/MessagesPage'));
const Marketplace = React.lazy(() => import('../features/marketplace/components/Marketplace'));
const EchoDetailModal = React.lazy(() => import('../features/timeline/components/EchoDetailModal'));

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
    usersWithStories: User[];
    conversations: Conversation[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    userToVerify: string | null;
    emailToReset: string | null;
    isGenerating: boolean;
    typingParentIds: Set<string>;
    nextAutoRefresh: Date | null;
    isAutoRefreshPaused: boolean;
    viewingStoryUser: User | null;
    setViewingStoryUser: (user: User | null) => void;
    
    // Handlers
    handleNavigate: (page: Page, data?: string) => void;
    handleLogin: (user: User) => void;
    handleLogout: () => void;
    handleNotificationClick: (notification: any) => void;
    handleNewPost: (post: Post) => void;
    handleUpdateReaction: (postId: string, reaction: any, actor?: User) => void;
    handleReply: (parentId: string, content: string, isPrivate: boolean, media?: any, actor?: User) => void;
    handleEcho: (post: Post, actor?: User) => void;
    handleDeletePost: (postId: string) => void;
    handleEditPost: (postId: string, data: any) => void;
    handlePollVote: (postId: string, optionIndex: number, actor?: User) => void;
    handleShowNewPosts: () => void;
    setIsCreatingStory: (val: boolean) => void;
    handleUpdateUser: (user: User) => Promise<{ success: boolean; error?: string }>;
    setIsMarketplaceOpen: (val: boolean) => void;
    handleBack: () => void;
    handleFollowToggle: (username: string, actor?: User) => void;
    handleSendGlitchi: (username: string) => void;
    handlePasswordReset: (email: string, pass: string) => void;
    onToggleChat: () => void;
    onOpenChat: (user: User) => void;
}

export default function AppRoutes(props: AppRoutesProps) {
    const {
        currentUser, users, setUsers, combinedUsers, memoizedPosts, memoizedAllPosts, memoizedUsers,
        pendingPosts, usersWithStories, conversations, selectedDate, setSelectedDate,
        userToVerify, emailToReset, isGenerating, typingParentIds, nextAutoRefresh, isAutoRefreshPaused,
        handleNavigate, handleLogin, handleLogout, handleNotificationClick, handleNewPost,
        handleUpdateReaction, handleReply, handleEcho, handleDeletePost, handleEditPost,
        handlePollVote, handleShowNewPosts, setIsCreatingStory, handleUpdateUser,
        setIsMarketplaceOpen, handleBack, handleFollowToggle, handleSendGlitchi, handlePasswordReset,
        setViewingStoryUser, onToggleChat, onOpenChat
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
                    usersWithStories={usersWithStories}
                    onViewStory={setViewingStoryUser}
                    onCreateStory={() => setIsCreatingStory(true)}
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => handleNavigate(Page.Dashboard, 'marketplace')} // Will be handled by route
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                />
            ) : <Navigate to="/welcome" />} />

            <Route path="/echo/:dateSegment" element={currentUser ? (
                <Dashboard 
                    user={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
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
                    usersWithStories={usersWithStories}
                    onViewStory={setViewingStoryUser}
                    onCreateStory={() => setIsCreatingStory(true)}
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                />
            ) : <Navigate to="/welcome" />} />

            {/* Rota de Perfil Padrão (/profile/username) */}
            <Route path="/profile/:username" element={currentUser ? (
                <ProfilePage
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
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
                    conversations={conversations}
                    onOpenMarketplace={() => handleNavigate(Page.Dashboard, 'marketplace')}
                    onUpdateUser={handleUpdateUser}
                    onBack={handleBack}
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
                    onUpdateUser={handleUpdateUser}
                    allUsers={combinedUsers}
                    allPosts={memoizedPosts}
                    conversations={conversations}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    onBack={handleBack}
                />
            ) : <Navigate to="/welcome" />} />
            
            <Route path="/data-slicer" element={currentUser ? (
                <DataSlicerPage 
                    user={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
                    allUsers={combinedUsers}
                    allPosts={memoizedPosts}
                    conversations={conversations}
                    onOpenMarketplace={() => handleNavigate(Page.Dashboard, 'marketplace')}
                    onBack={handleBack}
                />
            ) : <Navigate to="/welcome" />} />
            
            <Route path="/teste-chat" element={<ChatTest />} />
            
            <Route path="/cordao/:tag" element={currentUser ? (
                    <Dashboard 
                    user={currentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    onNotificationClick={handleNotificationClick}
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
                    usersWithStories={usersWithStories}
                    onViewStory={setViewingStoryUser}
                    onCreateStory={() => setIsCreatingStory(true)}
                    onUpdateUser={handleUpdateUser}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    nextAutoRefresh={nextAutoRefresh}
                    isAutoRefreshPaused={isAutoRefreshPaused}
                    onBack={handleBack}
                />
            ) : <Navigate to="/welcome" />} />

            {/* Redirect root */}
            <Route path="/" element={<Navigate to={currentUser ? "/echoframe" : "/welcome"} replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound onNavigate={handleNavigate} />} />
        </Routes>
    );
}