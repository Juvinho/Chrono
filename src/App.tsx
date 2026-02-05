import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Page, Post, CyberpunkReaction, Notification, NotificationType, Conversation, Message } from './types';
import { CORE_USERS } from './utils/constants';
import { useAppSession } from './hooks/useAppSession';
import { useAppTheme } from './hooks/useAppTheme';
import { LanguageProvider } from './hooks/useTranslation';
import { generateReplyContent } from './utils/geminiService';
import { apiClient, mapApiPostToPost } from './api';
import { socketService } from './utils/socketService';
import { useSound } from './contexts/SoundContext';
import { useToast } from './contexts/ToastContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import AppRoutes from './routes/AppRoutes';

// Lazy load components for performance
const Marketplace = React.lazy(() => import('./features/marketplace/components/Marketplace'));
const ChatDrawer = React.lazy(() => import('./features/messages/components/ChatDrawer'));
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
    
    // Chat Drawer State
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
    const [drawerActiveUser, setDrawerActiveUser] = useState<User | null>(null);
    
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
                navigate(data ? `/messages/${data}` : '/messages');
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
            case Page.ChatTest:
                navigate('/teste-chat');
                break;
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

    const handleMessageSent = useCallback((conversationId: string, message: Message) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id !== conversationId) return conv;
            const incomingId = (message as any)._replaceId || message.id;
            const replaceId = (message as any)._replaceId;
            const msgTs = (message as any).createdAt
                ? new Date((message as any).createdAt)
                : ((message as any).timestamp ? new Date((message as any).timestamp as any) : new Date());
            const idx = conv.messages.findIndex(m => (m as any).id === incomingId || (replaceId && (m as any).id === replaceId));
            let nextMessages: any[] = [];
            if (idx >= 0) {
                nextMessages = conv.messages.slice();
                const base = nextMessages[idx];
                nextMessages[idx] = { ...base, ...message, createdAt: msgTs || (base as any).createdAt || new Date() };
                // Se veio ID do servidor, substitui
                if (replaceId) {
                    nextMessages[idx].id = (message as any).id || (base as any).id;
                }
            } else {
                const created = msgTs || new Date();
                nextMessages = [...conv.messages, { ...message, createdAt: created }];
            }
            // Ordena por createdAt asc, com tie-breaker clientSeq e id
            nextMessages.sort((a: any, b: any) => {
                const at = new Date(a.createdAt || a.timestamp || 0).getTime();
                const bt = new Date(b.createdAt || b.timestamp || 0).getTime();
                if (at !== bt) return at - bt;
                const ac = a.clientSeq || 0;
                const bc = b.clientSeq || 0;
                if (ac !== bc) return ac - bc;
                return (a.id > b.id ? 1 : -1);
            });
            const latestTs = (nextMessages[nextMessages.length - 1] as any)?.createdAt || conv.lastMessageTimestamp || new Date();
            return {
                ...conv,
                messages: nextMessages,
                lastMessageTimestamp: latestTs,
            };
        }));
    }, []);

    const handleAppendMessages = useCallback((conversationId: string, messages: any[]) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
                const merged = [...conv.messages, ...messages].sort((a: any, b: any) => {
                    const at = new Date(a.createdAt || a.timestamp || 0).getTime();
                    const bt = new Date(b.createdAt || b.timestamp || 0).getTime();
                    if (at !== bt) return at - bt;
                    const ac = (a as any).clientSeq || 0;
                    const bc = (b as any).clientSeq || 0;
                    if (ac !== bc) return ac - bc;
                    return ((a as any).id > (b as any).id ? 1 : -1);
                });
                return { ...conv, messages: merged, lastMessageTimestamp: (merged[merged.length - 1] as any)?.createdAt || conv.lastMessageTimestamp };
            }
            return conv;
        }));
    }, []);

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

    const handleOpenChat = useCallback((username: string) => {
        if (!currentUser || username === currentUser.username) return;
        
        setOpenChatUsernames(prev => {
            if (prev.includes(username)) return prev;
            const next = [username, ...prev].slice(0, 3);
            return next;
        });
        setMinimizedChatUsernames(prev => prev.filter(u => u !== username));
    }, [currentUser]);

    const handleCloseChat = useCallback((username: string) => {
        setOpenChatUsernames(prev => prev.filter(u => u !== username));
        setMinimizedChatUsernames(prev => prev.filter(u => u !== username));
    }, []);

    const handleMinimizeChat = useCallback((username: string) => {
        setMinimizedChatUsernames(prev => {
            if (prev.includes(username)) {
                return prev.filter(u => u !== username);
            }
            return [...prev, username];
        });
    }, []);

    const handleToggleChatDrawer = useCallback(() => {
        setIsChatDrawerOpen(prev => !prev);
    }, []);

    const handleOpenChatDrawerWithUser = useCallback((user: User) => {
        setDrawerActiveUser(user);
        setIsChatDrawerOpen(true);
    }, []);

    // Socket.io Integration
    useEffect(() => {
        if (currentUser) {
            socketService.connect();
            if (currentUser.id) {
                socketService.joinUserRoom(currentUser.id);
            }

            const handleNewNotification = (payload: any) => {
                 console.log("New notification received:", payload);
                 
                 setCurrentUser(prev => {
                     if (!prev) return prev;
                     if (prev.notifications?.some(n => n.id === payload.id)) return prev;
                     
                     const notification = {
                         ...payload,
                         timestamp: new Date(payload.createdAt || Date.now())
                     };

                     return {
                         ...prev,
                         notifications: [notification, ...(prev.notifications || [])]
                     };
                 });
            };

            const handleNewMessage = async (payload: any) => {
                 const conversationExists = conversationsRef.current.some(c => c.id === payload.conversationId);
                 
                 if (!conversationExists) {
                     try {
                         const conversationsResult = await apiClient.getConversations();
                         if (conversationsResult.data) {
                             const mappedConversations = conversationsResult.data.map((conv: any) => ({
                                 id: conv.id,
                                 participants: conv.participants.map((p: any) => typeof p === 'string' ? p : (p.username || p)),
                                 messages: (conv.messages || []).map((msg: any) => ({
                                     id: msg.id,
                                     senderId: msg.senderId,
                                     senderUsername: msg.senderUsername || 'unknown',
                                     text: msg.text,
                                     imageUrl: msg.imageUrl,
                                     videoUrl: msg.videoUrl,
                                     status: msg.status,
                                     isEncrypted: msg.isEncrypted,
                                     timestamp: new Date(msg.createdAt || msg.created_at || Date.now()),
                                })).sort((a: any, b: any) => {
                                    const at = (a as any).timestamp || (a as any).createdAt;
                                    const bt = (b as any).timestamp || (b as any).createdAt;
                                    return new Date(at).getTime() - new Date(bt).getTime();
                                }),
                                 lastMessageTimestamp: new Date(conv.lastMessageTimestamp || conv.updated_at || Date.now()),
                                 unreadCount: conv.unreadCount || {},
                                 isEncrypted: conv.isEncrypted,
                                 selfDestructTimer: conv.selfDestructTimer
                             }));
                             setConversations(mappedConversations);
                         }
                     } catch (err) {
                         console.error("Error fetching new conversation:", err);
                     }
                 } else {
                     setConversations(prev => {
                        return prev.map(conv => {
                             if (conv.id === payload.conversationId) {
                                 if (conv.messages.some(m => m.id === payload.id)) return conv;
    
                                 const newMessage = {
                                     id: payload.id,
                                     senderId: payload.senderId,
                                     senderUsername: payload.senderUsername,
                                     text: payload.text,
                                     imageUrl: payload.imageUrl,
                                     videoUrl: payload.videoUrl,
                                     status: payload.status,
                                     isEncrypted: payload.isEncrypted,
                                     timestamp: new Date(payload.createdAt || Date.now())
                                 };
                                 
                                const msgs = [...conv.messages, newMessage].sort((a: any, b: any) => {
                                    const at = new Date((a as any).createdAt || (a as any).timestamp || 0).getTime();
                                    const bt = new Date((b as any).createdAt || (b as any).timestamp || 0).getTime();
                                    if (at !== bt) return at - bt;
                                    const ac = (a as any).clientSeq || 0;
                                    const bc = (b as any).clientSeq || 0;
                                    if (ac !== bc) return ac - bc;
                                    return ((a as any).id > (b as any).id ? 1 : -1);
                                });
                                return {
                                    ...conv,
                                    messages: msgs,
                                    lastMessageTimestamp: (msgs[msgs.length - 1] as any)?.createdAt || newMessage.timestamp,
                                };
                             }
                             return conv;
                         });
                     });
                 }
                 
                 if (payload.senderUsername !== currentUser.username) {
                     playSound('notification');
                     try {
                         await apiClient.updateMessageStatus(payload.conversationId, payload.id, 'delivered');
                     } catch (e) {}
                     handleOpenChat(payload.senderUsername);
                 }
            };

            const handleNewPost = (newPost: any) => {
                console.log("New post received via socket:", newPost.id);
                const mappedPost = mapApiPostToPost(newPost);
                
                setPosts(prevPosts => {
                    if (prevPosts.some(p => p.id === mappedPost.id)) return prevPosts;
                    return [mappedPost, ...prevPosts];
                });

                if (newPost.author?.username !== currentUser.username) {
                    playSound('post');
                }
                reloadBackendData();
            };

            const handleGlitchiReceived = (payload: any) => {
                console.log("Glitchi received from:", payload.senderUsername);
                setActiveGlitchi({ senderUsername: payload.senderUsername });
                playSound('notification');
            };

            const handleMessageStatusUpdate = (payload: { messageId: string, status: string, conversationId: string }) => {
                setConversations(prev => prev.map(conv => {
                    if (conv.id === payload.conversationId) {
                        return {
                            ...conv,
                            messages: conv.messages.map(msg => 
                                msg.id === payload.messageId ? { ...msg, status: payload.status as any } : msg
                            )
                        };
                    }
                    return conv;
                }));
            };

            socketService.on('new_notification', handleNewNotification);
            socketService.on('new_message', handleNewMessage);
            socketService.on('new_post', handleNewPost);
            socketService.on('glitchi_received', handleGlitchiReceived);
            socketService.on('message_status_update', handleMessageStatusUpdate);

            return () => {
                socketService.off('new_notification', handleNewNotification);
                socketService.off('new_message', handleNewMessage);
                socketService.off('new_post', handleNewPost);
                socketService.off('glitchi_received', handleGlitchiReceived);
                socketService.off('message_status_update', handleMessageStatusUpdate);
                socketService.disconnect();
            };
        } else {
            socketService.disconnect();
        }
    }, [currentUser, reloadBackendData, handleOpenChat]);

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
                return;
            }
            
            if (replier.username === currentUser.username) {
                playSound('reply');
            }

            await reloadBackendData();
        } catch (error) {
            console.error("Failed to reply via API:", error);
        }
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/echoframe');
        }
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
                            onToggleChat={handleToggleChatDrawer}
                            onOpenChat={handleOpenChatDrawerWithUser}
                        />


                        {/* Modals and Overlays */}

                        {currentUser && (
                            <Suspense fallback={null}>
                            <ChatDrawer
                                isOpen={isChatDrawerOpen}
                                onClose={() => setIsChatDrawerOpen(false)}
                                currentUser={currentUser}
                                conversations={conversations}
                                activeChatUser={drawerActiveUser}
                                onSetActiveChatUser={setDrawerActiveUser}
                                allUsers={combinedUsers}
                                onMessageSent={handleMessageSent}
                                onAppendMessages={handleAppendMessages}
                            />
                            </Suspense>
                        )}

                        
                        {/* Marketplace moved to route /marketplace */}
                        {/* {isMarketplaceOpen && currentUser && (
                            <Marketplace
                                currentUser={currentUser}
                                onClose={() => setIsMarketplaceOpen(false)}
                                onUserUpdate={handleUpdateUser}
                            />
                        )} */}
                        
                        {activeGlitchi && (
                            <GlitchiOverlay 
                                senderUsername={activeGlitchi.senderUsername}
                                onComplete={() => setActiveGlitchi(null)}
                            />
                        )}
                        
                    </div>
                </Suspense>
            </div>
        </LanguageProvider>
    );
}
