import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Page, Post, CyberpunkReaction, Notification, NotificationType, Conversation, Message } from './types';
import { CORE_USERS } from './utils/constants';
import { useAppSession } from './hooks/useAppSession';
import { useAppTheme } from './hooks/useAppTheme';
import { LanguageProvider } from './hooks/useTranslation';
import { generateReplyContent } from './utils/geminiService';
import { apiClient, mapApiPostToPost } from './api';
import { useSound } from './contexts/SoundContext';
import { useToast } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import AppRoutes from './routes/AppRoutes';
import { FloatingChatContainer } from './components/FloatingChatContainer';
import './styles/floating-chats.css';

// Lazy load components for performance
const Marketplace = React.lazy(() => import('./features/marketplace/components/Marketplace'));
// Chat system removed
const GlitchiOverlay = React.lazy(() => import('./features/companion/components/GlitchiOverlay'));

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const { playSound } = useSound();
    const { showToast } = useToast();

    // 1. UI and Content State
    // Defined before useAppSession because they are passed as dependencies
    const [posts, setPosts] = useState<Post[]>([]);
    const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    // Stories feature removed
    
    // Chat system removed
    
    // 2. Custom Hooks for Session and Theme
    const { 
        users, setUsers, 
        currentUser, setCurrentUser, 
        isSessionLoading, 
        reloadBackendData, 
        handleLogin, 
        handleLogout, 
        handleUpdateUser,
        handleFollowToggle
    } = useAppSession({ setPosts, setConversations, playSound });

    useAppTheme(currentUser);

    // 3. Other Local State
    // Stories feature removed
    // const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false); // Moved to route /marketplace
    const [openChatUsernames, setOpenChatUsernames] = useState<string[]>([]);
    const [minimizedChatUsernames, setMinimizedChatUsernames] = useState<string[]>([]);
    const [animationKey, setAnimationKey] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [userToVerify, setUserToVerify] = useState<string | null>(null);
    const [emailToReset, setEmailToReset] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [activeGlitchi, setActiveGlitchi] = useState<{ senderUsername: string } | null>(null);
    const [typingParentIds, setTypingParentIds] = useState(new Set<string>());
    const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
    const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);
    const [lastViewedNotifications, setLastViewedNotifications] = useState<Date | null>(null);

    // 4. Refs
    const usersRef = useRef(users);
    const postsRef = useRef(posts);
    const conversationsRef = useRef(conversations);
    const lastInteractionRef = useRef<number>(Date.now());
    
    useEffect(() => { usersRef.current = users; }, [users]);
    useEffect(() => { postsRef.current = posts; }, [posts]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    // Navigation Handler (Legacy support for child components)
    const handleNavigate = useCallback((page: Page, data?: string) => {
        switch (page) {
            case Page.Dashboard:
                navigate('/echoframe');
                break;
            case Page.Profile:
                if (data) navigate(`/profile/${data}`);
                else if (currentUser) navigate(`/profile/${currentUser.username}`);
                else navigate('/login');
                break;
            case Page.Settings:
                navigate('/settings');
                break;
            case Page.Messages:
                if (data) {
                    const targetUser = users.find(u => u.username === data);
                    if (targetUser) {
                         navigate('/messages', { state: { targetUserId: targetUser.id } });
                    } else {
                         navigate('/messages');
                    }
                } else {
                    navigate('/messages');
                }
                break;
            case Page.VideoAnalysis:
                navigate('/data-slicer');
                break;
            case Page.Login:
                navigate('/login');
                break;
            case Page.Register:
                navigate('/register');
                break;
            case Page.Verify:
                navigate('/verify');
                break;
            case Page.ForgotPassword:
                navigate('/forgot-password');
                break;
            case Page.ResetPassword:
                navigate('/reset-password');
                break;
            case Page.Welcome:
                navigate('/welcome');
                break;
            // ChatTest route removed
            default:
                navigate('/echoframe');
        }
    }, [navigate, currentUser]);

    // Stories feature removed

    // Sync posts to displayedPosts and pendingPosts
    useEffect(() => {
        if (posts.length === 0) return;

        if (displayedPosts.length === 0) {
            setDisplayedPosts(posts);
            return;
        }

        const displayedIds = new Set(displayedPosts.map(p => p.id));
        const postsMap = new Map(posts.map(p => [p.id, p]));

        const updatedDisplayed = displayedPosts
            .filter(p => postsMap.has(p.id))
            .map(p => postsMap.get(p.id)!);

        setDisplayedPosts(updatedDisplayed);

        const newItems = posts.filter(p => !displayedIds.has(p.id));
        
        if (newItems.length > 0) {
            setPendingPosts(prev => {
                const prevIds = new Set(prev.map(p => p.id));
                const uniqueNewItems = newItems.filter(p => !prevIds.has(p.id));
                if (uniqueNewItems.length === 0) return prev;
                return [...uniqueNewItems, ...prev];
            });
        }
    }, [posts]);

    const handleShowNewPosts = () => {
        setDisplayedPosts(prev => {
            const currentIds = new Set(prev.map(p => p.id));
            const uniquePending = pendingPosts.filter(p => !currentIds.has(p.id));
            return [...uniquePending, ...prev];
        });
        setPendingPosts([]);
    };

    // User Interaction Tracking
    useEffect(() => {
        const handleInteraction = () => {
            lastInteractionRef.current = Date.now();
        };

        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('click', handleInteraction);
        window.addEventListener('scroll', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('scroll', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    // Auto Refresh Logic
    useEffect(() => {
        if (!currentUser?.profileSettings?.autoRefreshEnabled) {
            setNextAutoRefresh(null);
            setIsAutoRefreshPaused(false);
            return;
        }

        const intervalMinutes = currentUser.profileSettings.autoRefreshInterval || 5;
        const intervalMs = intervalMinutes * 60 * 1000;
        
        let targetTime = new Date(Date.now() + intervalMs);
        setNextAutoRefresh(targetTime);

        const checkInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceInteraction = now - lastInteractionRef.current;
            const isPaused = timeSinceInteraction < 30000; // Pause if interaction in last 30s
            
            setIsAutoRefreshPaused(isPaused);

            if (now >= targetTime.getTime()) {
                if (!isPaused) {
                    console.log("Auto-refreshing data...");
                    reloadBackendData();
                    targetTime = new Date(now + intervalMs);
                    setNextAutoRefresh(targetTime);
                } else {
                    targetTime = new Date(now + 10000);
                    setNextAutoRefresh(targetTime);
                }
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [currentUser?.profileSettings?.autoRefreshEnabled, currentUser?.profileSettings?.autoRefreshInterval, reloadBackendData]);

    // Chat open/minimize handlers removed

    // Chat close handler removed

    // Chat minimize handler removed

    // Chat drawer toggle removed

    // Chat drawer open removed

    // Real-time socket integration removed

    // MIGRATION: Fetch initial data from Backend
    useEffect(() => {
        if (currentUser) {
            if (isInitialLoading) {
                setIsGenerating(true);
                reloadBackendData()
                    .finally(() => {
                        setIsGenerating(false);
                        setIsInitialLoading(false);
                    });
            } else {
                reloadBackendData();
            }
        }
    }, [currentUser, reloadBackendData, isInitialLoading]);

    // Removed desktop notification permission request

    // Stories feature removed

    const handleReply = async (parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }, actor?: User) => {
        const replier = actor || currentUser;
        if (!replier) return;
    
        try {
            const result = await apiClient.replyToPost(parentPostId, content, isPrivate, media);
            if (result.error) {
                console.error("Failed to reply via API:", result.error);
                showToast('Falha ao enviar resposta: ' + result.error, 'error');
                return;
            }
            
            if (replier.username === currentUser.username) {
                playSound('reply');
                showToast('Resposta enviada!', 'success');
            }

            await reloadBackendData();
            
            // Also load the parent post with updated replies
            const parentPostResult = await apiClient.getPost(parentPostId);
            if (parentPostResult.data) {
                const mappedParentPost = mapApiPostToPost(parentPostResult.data);
                setPosts(prev => prev.map(p => p.id === parentPostId ? mappedParentPost : p));
            }
        } catch (error) {
            console.error("Failed to reply via API:", error);
            showToast('Falha ao enviar resposta.', 'error');
        }
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/echoframe');
        }
    };

    const handleOpenThreadView = (postId: string) => {
        navigate(`/thread/${postId}`);
    };

    const simulateUserPostInteraction = (post: Post) => {
        if (!currentUser) return;
    
        const aiUsers = usersRef.current.filter(u => u.username !== currentUser.username && !CORE_USERS.some(cu => cu.username === u.username));
        if (aiUsers.length === 0) return;
    
        const reactionRoll = Math.random();
        let reactionCount = 0;
        if (reactionRoll > 0.5) { 
            reactionCount = Math.floor(Math.random() * 3); 
        }

        for (let i = 0; i < reactionCount; i++) {
            setTimeout(() => {
                const reactor = aiUsers[Math.floor(Math.random() * aiUsers.length)];
                const reactions: CyberpunkReaction[] = ['Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'];
                const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                handleUpdateReaction(post.id, randomReaction, reactor);
            }, 3000 + Math.random() * 10000); 
        }
    
        const replyRoll = Math.random();
        if (replyRoll > 0.85) { 
             const replyDelay = 7000 + Math.random() * 15000; 
             setTimeout(() => {
                const replierSkeleton = aiUsers[Math.floor(Math.random() * aiUsers.length)];
                
                setTypingParentIds(prev => new Set(prev).add(post.id));
    
                const typingDuration = 3000 + Math.random() * 4000;
                setTimeout(async () => {
                    try {
                        const replyData = await generateReplyContent(post.content);
                        if (replyData) {
                            const replier = { ...replierSkeleton, username: replyData.username, bio: replyData.bio };
                            handleReply(post.id, replyData.content, Math.random() < 0.1, replier);
                        }
                    } catch (error) {
                        console.warn("User post interaction simulation: Failed to generate a reply due to API error.", error);
                    } finally {
                        setTypingParentIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(post.id);
                            return newSet;
                        });
                    }
                }, typingDuration);
                
            }, replyDelay);
        }
    };

    const handleNewPost = async (post: Post) => {
        if (post.author.username === currentUser?.username) {
            playSound('post');
            showToast('Post publicado com sucesso!', 'success');
        }

        await reloadBackendData();
        
        // Check for triggers and simulate interactions (removed checkForTriggers impl)
        if (post.author.username === currentUser?.username) {
            simulateUserPostInteraction(post);
        }
    };
    
    const handleUpdateReaction = async (postId: string, reaction: CyberpunkReaction, actor?: User) => {
        const reactor = actor || currentUser;
        if (!reactor) return;

        try {
            const result = await apiClient.updateReaction(postId, reaction);
            if (result.error) {
                if (reactor.username === currentUser?.username) showToast(result.error, 'error');
                return;
            }
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to update reaction via API:", error);
            if (reactor.username === currentUser?.username) showToast('Falha ao reagir ao post.', 'error');
        }
    };

    const handleEcho = async (postToEcho: Post, actor?: User) => {
        const echoer = actor || currentUser;
        if (!echoer) return;
        if (postToEcho.repostOf) return; 

        try {
            const result = await apiClient.echoPost(postToEcho.id);
            if (result.error) {
                if (echoer.username === currentUser?.username) showToast(result.error, 'error');
                return;
            }
            
            if (echoer.username === currentUser.username) {
                playSound('notification');
                showToast('Post ecoado!', 'success');
            }
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to echo post via API:", error);
            if (echoer.username === currentUser?.username) showToast('Falha ao ecoar post.', 'error');
        }
    };

    const handleDeletePost = async (postIdToDelete: string) => {
        if (!currentUser) return;
        try {
            const result = await apiClient.deletePost(postIdToDelete);
            if (result.error) {
                showToast(result.error, 'error');
                return;
            }
            showToast('Post deletado.', 'info');
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to delete post via API:", error);
            showToast('Falha ao deletar post.', 'error');
        }
    };

    const handleEditPost = async (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>) => {
         if (!currentUser) return;
         try {
             const updateData: any = {
                 content: newPostData.content,
                 isPrivate: newPostData.isPrivate,
                 imageUrl: newPostData.imageUrl,
                 videoUrl: newPostData.videoUrl,
                 poll: newPostData.poll,
             };
             
             const result = await apiClient.updatePost(postId, updateData);
             if (result.error) {
                 showToast(result.error, 'error');
                 return;
             }
             
             showToast('Post atualizado.', 'success');
             await reloadBackendData();
         } catch (error) {
             console.error("Failed to update post via API:", error);
             showToast('Falha ao atualizar post.', 'error');
         }
    };

     const handlePollVote = async (postId: string, optionIndex: number, actor?: User) => {
        const voter = actor || currentUser;
        if (!voter) return;
        try {
            const result = await apiClient.votePoll(postId, optionIndex);
            if (result.error) {
                console.error("Failed to vote via API:", result.error);
                return;
            }
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to vote via API:", error);
        }
    };

    const handleSendGlitchi = async (recipientUsername: string) => {
        if (!currentUser) return;
        try {
            const result = await apiClient.sendGlitchi(recipientUsername);
            if (result.error) {
                showToast(result.error, 'error');
                return;
            }
            showToast('Você mandou um glitchi!', 'success');
            playSound('glitch'); 
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to send glitchi:", error);
            showToast('Failed to send glitchi', 'error');
        }
    };

    const handlePasswordReset = (email: string, newPass: string) => {
        setUsers(prev => prev.map(u => u.email === email ? { ...u, password: newPass } : u));
        sessionStorage.setItem('chrono_login_message', 'Password reset successfully. Please log in.');
        handleNavigate(Page.Login);
    }
    
    const handleViewNotifications = async () => {
        if (!currentUser) return;
        
        try {
            const result = await apiClient.markAllNotificationsRead();
            if (result.error) {
                console.error("Failed to mark all notifications read:", result.error);
                return;
            }
            setCurrentUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    notifications: prev.notifications?.map(n => ({ ...n, read: true }))
                };
            });
            setLastViewedNotifications(new Date());
        } catch (err) {
            console.error("Error marking all notifications read:", err);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!currentUser) return;

        if (notification.post) {
            setSelectedDate(new Date(notification.post.timestamp));
            sessionStorage.setItem('chrono_focus_post_id', notification.post.id);
            handleNavigate(Page.Dashboard);
        } else if (notification.notificationType === 'follow' && notification.actor?.username) {
            handleNavigate(Page.Profile, notification.actor.username);
        }

        try {
            const result = await apiClient.markNotificationRead(notification.id as any);
            if (result.error) {
                console.error("Failed to mark notification read:", result.error);
            }
            setCurrentUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    notifications: prev.notifications?.map(n => n.id === notification.id ? { ...n, read: true } : n)
                };
            });
        } catch (err) {
            console.error("Error marking notification read:", err);
        }
    }

    const memoizedUsers = useMemo(() => users, [users]);
    const memoizedPosts = useMemo(() => displayedPosts, [displayedPosts]);
    const memoizedAllPosts = useMemo(() => posts, [posts]);
    
    const combinedUsers = useMemo(() => {
        const map = new Map<string, User>();
        memoizedUsers.forEach(u => map.set(u.username.toLowerCase(), u));
        const collect = (p: Post) => {
            if (p.author) {
                const key = p.author.username.toLowerCase();
                if (!map.has(key)) map.set(key, p.author as User);
            }
            if (p.repostOf) collect(p.repostOf);
            if (p.inReplyTo && p.inReplyTo.author) {
                const key = p.inReplyTo.author.username.toLowerCase();
                if (!map.has(key)) map.set(key, p.inReplyTo.author as unknown as User);
            }
            if (p.replies) p.replies.forEach(collect);
        };
        memoizedPosts.forEach(collect);
        return Array.from(map.values());
    }, [memoizedUsers, memoizedPosts]);

    if (isSessionLoading && !currentUser) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[var(--theme-primary)] font-mono animate-pulse">ESTABLISHING UPLINK...</p>
            </div>
        );
    }

    return (
        <LanguageProvider>
            <AuthProvider user={currentUser}>
                <div key={animationKey} className="page-transition">
                    <Suspense fallback={<LoadingSpinner />}>
                        <div className={`app-container ${currentUser?.profileSettings?.theme || 'theme-cyberpunk'}`}>
                            <AppRoutes
                                currentUser={currentUser}
                                users={users}
                                setUsers={setUsers}
                                posts={posts}
                                combinedUsers={combinedUsers}
                                memoizedPosts={memoizedPosts}
                                memoizedUsers={memoizedUsers}
                                memoizedAllPosts={memoizedAllPosts}
                                pendingPosts={pendingPosts}
                                conversations={conversations}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                userToVerify={userToVerify}
                                emailToReset={emailToReset}
                                isGenerating={isGenerating}
                                typingParentIds={typingParentIds}
                                nextAutoRefresh={nextAutoRefresh}
                                isAutoRefreshPaused={isAutoRefreshPaused}
                                handleNavigate={handleNavigate}
                                handleLogin={handleLogin}
                                handleLogout={handleLogout}
                                handleNotificationClick={handleNotificationClick}
                                onViewNotifications={handleViewNotifications}
                                handleNewPost={handleNewPost}
                                handleUpdateReaction={handleUpdateReaction}
                                handleReply={handleReply}
                                handleEcho={handleEcho}
                                handleDeletePost={handleDeletePost}
                                handleEditPost={handleEditPost}
                                handlePollVote={handlePollVote}
                                handleShowNewPosts={handleShowNewPosts}
                                
                                setIsMarketplaceOpen={() => navigate('/marketplace')}
                                handleBack={handleBack}
                                handleFollowToggle={handleFollowToggle}
                                handleSendGlitchi={handleSendGlitchi}
                                handlePasswordReset={handlePasswordReset}
                            />

                            {activeGlitchi && (
                                <GlitchiOverlay 
                                    senderUsername={activeGlitchi.senderUsername}
                                    onComplete={() => setActiveGlitchi(null)}
                                />
                            )}

                            <FloatingChatContainer currentUser={currentUser} />
                        </div>
                    </Suspense>
                </div>
            </AuthProvider>
        </LanguageProvider>
    );
}
