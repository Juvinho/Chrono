import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from 'react';
import { User, Page, Post, CyberpunkReaction, Notification, NotificationType, Conversation, Message, Story } from './types';
import { CORE_USERS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { LanguageProvider } from './hooks/useTranslation';
import { generatePostContent, generateReplyContent, generatePollVote, generateDirectMessageReply } from './services/geminiService';
import { apiClient, mapApiUserToUser, mapApiPostToPost, mapApiStoryToStory } from './services/api';
import { NotificationManager } from './services/notificationManager';
import { socketService } from './services/socketService';
import { useSound } from './contexts/SoundContext';
import { useToast } from './contexts/ToastContext';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components for performance
const LoginScreen = React.lazy(() => import('./components/LoginScreen'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const Welcome = React.lazy(() => import('./components/Welcome'));
const Register = React.lazy(() => import('./components/Register'));
const Verify = React.lazy(() => import('./components/Verify'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const MessagesPage = React.lazy(() => import('./components/MessagesPage'));
const DataSlicerPage = React.lazy(() => import('./components/DataSlicerPage'));
const StoryViewer = React.lazy(() => import('./components/StoryViewer'));
const StoryCreator = React.lazy(() => import('./components/StoryCreator'));
const Marketplace = React.lazy(() => import('./components/Marketplace'));


const placeholderVideos = [
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
];


// Helper function to revive dates recursively from JSON strings
const reviveDates = (data: any[], dateKeys: string[]): any[] => {
    const revive = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;

        const revivedObj: any = { ...obj };

        for (const key in revivedObj) {
            if (dateKeys.includes(key) && revivedObj[key]) {
                revivedObj[key] = new Date(revivedObj[key]);
            } else if (Array.isArray(revivedObj[key])) {
                 revivedObj[key] = revivedObj[key].map(revive);
            } else if (typeof revivedObj[key] === 'object') {
                 revivedObj[key] = revive(revivedObj[key]);
            }
        }
        return revivedObj;
    };
    if (!Array.isArray(data)) return [];
    return data.map(revive);
};

export default function App() {
    // 1. Basic User State (used by almost everything)
    const [users, setUsers] = useLocalStorage<User[]>('chrono_users_v4', []); 
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('chrono_currentUser_v4', null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Navigation State (depends on currentUser)
    const getInitialPage = (): Page => {
        if (currentUser) {
            const savedPage = sessionStorage.getItem('chrono_currentPage');
            if (savedPage) {
                const pageNum = parseInt(savedPage, 10);
                if (pageNum >= 0 && pageNum < Object.keys(Page).length / 2) {
                    return pageNum as Page;
                }
            }
            return Page.Dashboard;
        }
        return Page.Welcome;
    };
    
    const [currentPage, setCurrentPage] = useState<Page>(getInitialPage());
    const [profileUsername, setProfileUsername] = useState<string | null>(null);

    // 3. UI and Content State
    const [posts, setPosts] = useState<Post[]>([]);
    const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [viewingStoryUser, setViewingStoryUser] = useState<User | null>(null);
    const [isCreatingStory, setIsCreatingStory] = useState(false);
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
    
    // 4. Refs and Services
    const { playSound } = useSound();
    const { showToast } = useToast();
    const usersRef = useRef(users);
    const postsRef = useRef(posts);
    const conversationsRef = useRef(conversations);
    const knownNotificationIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);
    const lastInteractionRef = useRef<number>(Date.now());
    
    useEffect(() => { usersRef.current = users; }, [users]);
    useEffect(() => { postsRef.current = posts; }, [posts]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    // 5. Derived State (useMemo) - Now safe because dependencies are defined above
    const usersWithStories = useMemo(() => {
        if (!currentUser) return [];
        
        const storiesByUser = new Map<string, Story[]>();
        stories.forEach(story => {
            const userId = story.userId;
            if (!storiesByUser.has(userId)) {
                storiesByUser.set(userId, []);
            }
            storiesByUser.get(userId)!.push(story);
        });

        const usersWithStoriesList: User[] = [];
        
        storiesByUser.forEach((userStories, userId) => {
             const firstStory = userStories[0];
             if (firstStory.author && firstStory.author.username !== currentUser.username) {
                 usersWithStoriesList.push({
                     ...firstStory.author,
                     stories: userStories
                 });
             }
        });
        
        return usersWithStoriesList;
    }, [stories, currentUser]);

    // 6. Other states and hooks
    const [animationKey, setAnimationKey] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [userToVerify, setUserToVerify] = useState<string | null>(null);
    const [emailToReset, setEmailToReset] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [typingParentIds, setTypingParentIds] = useState(new Set<string>());
    const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
    const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);

    // 7. Logic and Effects
    // Update current user stories
    useEffect(() => {
        if (currentUser) {
            const myStories = stories.filter(s => s.userId === currentUser.id || s.userId === currentUser.username);
            if (JSON.stringify(currentUser.stories) !== JSON.stringify(myStories)) {
                setCurrentUser(prev => prev ? { ...prev, stories: myStories } : null);
            }
        }
    }, [stories]);

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

    // Validate Session on Mount
    useEffect(() => {
        const validateSession = async () => {
            const token = apiClient.getToken();
            if (token) {
                try {
                    const result = await apiClient.getCurrentUser();
                    if (result.data) {
                        const mappedUser = mapApiUserToUser(result.data);
                        setCurrentUser(mappedUser);

                        const storiesResult = await apiClient.getStories();
                        if (storiesResult.data) {
                            setStories(storiesResult.data.map(mapApiStoryToStory));
                        }

                        // Load initial users (recommended/popular)
                        const usersRes = await apiClient.searchUsers('');
                        if (usersRes.data) {
                            setUsers(usersRes.data);
                        }
                    } else {
                        console.warn("Session expired or invalid, logging out.");
                        setCurrentUser(null);
                        apiClient.setToken(null);
                    }
                } catch (error) {
                    console.error("Session validation failed:", error);
                    setCurrentUser(null);
                    apiClient.setToken(null);
                }
            }
            setIsSessionLoading(false);
        };
        
        validateSession();
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




    // Helper function to reload data from backend
    const reloadBackendData = useCallback(async () => {
        if (!currentUser) return;
        
        try {
            // Reload current user to ensure follow counts and lists are accurate
            const userResult = await apiClient.getCurrentUser();
            if (userResult.data) {
                const mappedUser = mapApiUserToUser(userResult.data);
                // Update local storage and state
                setCurrentUser(mappedUser);
                
                // Update in users array if present
                setUsers(prev => prev.map(u => u.username === mappedUser.username ? mappedUser : u));
            }

            // Reload stories
            const storiesRes = await apiClient.getStories();
            if (storiesRes.data) {
                setStories(storiesRes.data.map(mapApiStoryToStory));
            }

            // Reload posts
            const postsResult = await apiClient.getPosts();
            if (postsResult.data) {
                // Deduplicate posts based on ID
                const uniquePosts = postsResult.data.reduce((acc: any[], current: any) => {
                    const x = acc.find(item => item.id === current.id);
                    if (!x) {
                        return acc.concat([current]);
                    } else {
                        return acc;
                    }
                }, []);

                const mappedPosts = uniquePosts.map((p: any) => {
                    const mapped = mapApiPostToPost(p);
                    // Ensure timestamp is a Date object
                    if (mapped.timestamp && typeof mapped.timestamp === 'string') {
                        mapped.timestamp = new Date(mapped.timestamp);
                    }
                    return mapped;
                });
                setPosts(mappedPosts);
            }

            // Reload conversations
            const conversationsResult = await apiClient.getConversations();
            if (conversationsResult.data) {
                const mappedConversations = conversationsResult.data.map((conv: any) => ({
                    id: conv.id,
                    participants: conv.participants.map((p: any) => typeof p === 'string' ? p : (p.username || p)),
                    messages: (conv.messages || []).map((msg: any) => ({
                        id: msg.id,
                        senderUsername: msg.senderUsername || (msg.sender_id ? 'unknown' : 'unknown'),
                        text: msg.text,
                        timestamp: new Date(msg.createdAt || msg.created_at || Date.now()),
                    })),
                    lastMessageTimestamp: new Date(conv.lastMessageTimestamp || conv.updated_at || Date.now()),
                    unreadCount: conv.unreadCount || {},
                }));
                setConversations(mappedConversations);
            }
            
            // Reload notifications
            const notificationsResult = await apiClient.getNotifications();
            if (notificationsResult.data) {
                const notifications = notificationsResult.data.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp || Date.now())
                }));

                notifications.forEach((n: any) => {
                    if (!n.isRead && !knownNotificationIds.current.has(n.id)) {
                        if (!isFirstLoad.current) {
                             try {
                                 const message = NotificationManager.formatNotificationMessage(n.notificationType, n.actor, n.post);
                                 NotificationManager.showNotification('Chrono', {
                                    body: message,
                                    tag: n.id
                                 });
                                 playSound('notification');
                             } catch (err) {
                                 console.error("Error showing notification:", err);
                             }
                        }
                        knownNotificationIds.current.add(n.id);
                    } else {
                         knownNotificationIds.current.add(n.id);
                    }
                });

                if (currentUser) {
                    setCurrentUser(prev => prev ? { ...prev, notifications } : prev);
                }
            }

            // Reload stories
            const storiesResult = await apiClient.getStories();
            if (storiesResult.data) {
                const stories = storiesResult.data.map((s: any) => ({
                    id: s.id,
                    userId: s.userId,
                    username: s.author?.username || 'unknown',
                    userAvatar: s.author?.avatar || null,
                    content: s.content,
                    type: s.type,
                    timestamp: new Date(s.createdAt || s.created_at),
                    expiresAt: new Date(s.expiresAt || s.expires_at),
                    viewers: s.viewers || []
                }));

                // Group stories by user and update users state
                const storiesByUser = new Map<string, Story[]>();
                stories.forEach((s: Story) => {
                    const existing = storiesByUser.get(s.username) || [];
                    storiesByUser.set(s.username, [...existing, s]);
                });

                setUsers(currentUsers =>
                    currentUsers.map(u => {
                        if (storiesByUser.has(u.username)) {
                            return { ...u, stories: storiesByUser.get(u.username) };
                        }
                        return u;
                    })
                );
            }
            
            isFirstLoad.current = false;
        } catch (error) {
            console.error("Failed to reload backend data:", error);
        }
    }, [currentUser]);

    // Auto Refresh Logic
    useEffect(() => {
        if (!currentUser?.profileSettings?.autoRefreshEnabled) {
            setNextAutoRefresh(null);
            setIsAutoRefreshPaused(false);
            return;
        }

        const intervalMinutes = currentUser.profileSettings.autoRefreshInterval || 5;
        const intervalMs = intervalMinutes * 60 * 1000;
        
        // Set initial target time
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
                    // If paused, postpone refresh check by 10 seconds
                    // But keep the visual targetTime "overdue" or update it? 
                    // Let's update it to show it's delayed.
                    targetTime = new Date(now + 10000);
                    setNextAutoRefresh(targetTime);
                }
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [currentUser?.profileSettings?.autoRefreshEnabled, currentUser?.profileSettings?.autoRefreshInterval, reloadBackendData]);
    




    // Socket.io Integration
    useEffect(() => {
        if (currentUser) {
            socketService.connect();
            if (currentUser.id) {
                socketService.joinUserRoom(currentUser.id);
            }

            const handleNewNotification = (payload: any) => {
                 console.log("New notification received:", payload);
                 
                 // Update state
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

                 // Play sound and show toast
                 try {
                     const message = NotificationManager.formatNotificationMessage(payload.notificationType, payload.actor, payload.post);
                     NotificationManager.showNotification('Chrono', {
                        body: message,
                        tag: payload.id
                     });
                     
                     if (payload.notificationType === 'reply') {
                         playSound('reply');
                     } else if (payload.notificationType === 'follow') {
                         playSound('follow');
                     } else if (payload.notificationType === 'reaction') {
                         playSound('like');
                     } else {
                         playSound('notification');
                     }
                 } catch (err) {
                     console.error("Error showing notification:", err);
                 }
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
                                     senderUsername: msg.senderUsername || 'unknown',
                                     text: msg.text,
                                     timestamp: new Date(msg.createdAt || msg.created_at || Date.now()),
                                 })),
                                 lastMessageTimestamp: new Date(conv.lastMessageTimestamp || conv.updated_at || Date.now()),
                                 unreadCount: conv.unreadCount || {},
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
                                     senderUsername: payload.senderUsername,
                                     text: payload.text,
                                     timestamp: new Date(payload.createdAt || Date.now())
                                 };
                                 
                                 return {
                                     ...conv,
                                     messages: [newMessage, ...conv.messages],
                                     lastMessageTimestamp: newMessage.timestamp,
                                 };
                             }
                             return conv;
                         });
                     });
                 }
                 
                 if (payload.senderUsername !== currentUser.username) {
                     playSound('notification');
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
                
                // Also reload backend data for full sync
                reloadBackendData();
            };

            socketService.on('new_notification', handleNewNotification);
            socketService.on('new_message', handleNewMessage);
            socketService.on('new_post', handleNewPost);

            return () => {
                socketService.off('new_notification', handleNewNotification);
                socketService.off('new_message', handleNewMessage);
                socketService.off('new_post', handleNewPost);
                socketService.disconnect();
            };
        } else {
            socketService.disconnect();
        }
    }, [currentUser, reloadBackendData]);


    // Restore page on mount if user is logged in but page is Welcome
    useEffect(() => {
        if (currentUser && currentPage === Page.Welcome) {
            if (typeof window !== 'undefined') {
                const path = window.location.pathname || '/';
                const segments = path.split('/').filter(Boolean);

                if (segments.length > 0) {
                    const first = segments[0];

                    if (first.startsWith('@')) {
                        const usernameFromPath = decodeURIComponent(first.substring(1));
                        if (usernameFromPath) {
                            setProfileUsername(usernameFromPath);
                        }
                        setCurrentPage(Page.Profile);
                        sessionStorage.setItem('chrono_currentPage', Page.Profile.toString());
                        return;
                    }

                    if (first === 'echo') {
                        if (segments.length >= 2) {
                            const dateSegment = segments[1];
                            const parsed = parseDateSegment(dateSegment);
                            if (parsed) {
                                setSelectedDate(parsed);
                            }
                        }
                        setCurrentPage(Page.Dashboard);
                        sessionStorage.setItem('chrono_currentPage', Page.Dashboard.toString());
                        return;
                    }

                    if (first === 'settings') {
                        setCurrentPage(Page.Settings);
                        sessionStorage.setItem('chrono_currentPage', Page.Settings.toString());
                        return;
                    }

                    if (first === 'messages') {
                        setCurrentPage(Page.Messages);
                        sessionStorage.setItem('chrono_currentPage', Page.Messages.toString());
                        return;
                    }

                    if (first.startsWith('$')) {
                        const tag = `$${decodeURIComponent(first.substring(1))}`;
                        sessionStorage.setItem('chrono_search_query', tag);

                        if (segments.length >= 2) {
                            const dateSegment = segments[1];
                            const parsed = parseDateSegment(dateSegment);
                            if (parsed) {
                                setSelectedDate(parsed);
                            }
                        }

                        setCurrentPage(Page.Dashboard);
                        sessionStorage.setItem('chrono_currentPage', Page.Dashboard.toString());
                        return;
                    }
                }
            }

            const savedPage = sessionStorage.getItem('chrono_currentPage');
            if (savedPage) {
                const pageNum = parseInt(savedPage, 10);
                if (pageNum >= 0 && pageNum < Object.keys(Page).length / 2) {
                    setCurrentPage(pageNum as Page);
                } else {
                    setCurrentPage(Page.Dashboard);
                    sessionStorage.setItem('chrono_currentPage', Page.Dashboard.toString());
                }
            } else {
                setCurrentPage(Page.Dashboard);
                sessionStorage.setItem('chrono_currentPage', Page.Dashboard.toString());
            }
        }
    }, [currentUser]); // Run when currentUser changes

    useEffect(() => {
        if (!currentUser) return;
        if (currentPage !== Page.Dashboard) return;
        if (typeof window === 'undefined' || !window.history || !window.location) return;

        const today = new Date();
        const isToday = today.toDateString() === selectedDate.toDateString();
        const basePath = '/echo';
        const path = isToday ? basePath : `${basePath}/${formatDateSegment(selectedDate)}`;

        const currentFullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const nextFullPath = `${path}${window.location.search}${window.location.hash}`;

        if (currentFullPath !== nextFullPath) {
            window.history.pushState({ page: Page.Dashboard, date: selectedDate.toISOString() }, '', nextFullPath);
        }
    }, [selectedDate, currentPage, currentUser]);

    // Handle Browser Back/Forward Buttons
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state) {
                const { page, data, date } = event.state;
                
                if (page !== undefined) {
                    setCurrentPage(page);
                    sessionStorage.setItem('chrono_currentPage', page.toString());
                    
                    if (page === Page.Profile && data) {
                        setProfileUsername(data);
                    } else {
                         // Don't nullify if we are just navigating back to dashboard?
                         // Actually, if we go back to dashboard, profileUsername should be null.
                         setProfileUsername(null);
                    }
                    
                    if (date) {
                        setSelectedDate(new Date(date));
                    }
                }
            } else {
                // If no state (e.g., initial load or external link), try to parse URL
                 if (typeof window !== 'undefined') {
                    const path = window.location.pathname || '/';
                    const segments = path.split('/').filter(Boolean);
                    
                    if (segments.length > 0) {
                         const first = segments[0];
                         if (first.startsWith('@')) {
                             setProfileUsername(decodeURIComponent(first.substring(1)));
                             setCurrentPage(Page.Profile);
                         } else if (first === 'echo') {
                             setCurrentPage(Page.Dashboard);
                         } else if (first === 'settings') {
                             setCurrentPage(Page.Settings);
                         } else if (first === 'messages') {
                             setCurrentPage(Page.Messages);
                         } else if (first === 'data-slicer') {
                             setCurrentPage(Page.VideoAnalysis);
                         }
                    } else {
                        setCurrentPage(Page.Dashboard);
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // MIGRATION: Fetch initial data from Backend
    useEffect(() => {
        if (currentUser) {
            setIsGenerating(true);
            reloadBackendData().finally(() => setIsGenerating(false));
        }
    }, [currentUser, reloadBackendData]); // Re-fetch on login

    // Polling for notifications is now handled by the configurable auto-refresh
    useEffect(() => {
        if (!currentUser) return;
        
        NotificationManager.requestPermission();
        
        // Removed hardcoded 10s interval in favor of user-configurable setting
    }, [currentUser]);



    const addNotification = (targetUser: User, actor: User, notificationType: NotificationType, post?: Post) => {
        if (targetUser.username === actor.username) return; // Don't send notifications for own actions

        // Play sound if the notification is for the current user
        if (currentUser && targetUser.username === currentUser.username) {
            playSound('notification');
        }


        const newNotification: Notification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            actor,
            notificationType,
            post,
            read: false,
            timestamp: new Date(),
        };

        setUsers(currentUsers =>
            currentUsers.map(u => {
                if (u.username === targetUser.username) {
                    return {
                        ...u,
                        notifications: [newNotification, ...(u.notifications || [])],
                    };
                }
                return u;
            })
        );
    };



    // Story Handlers - usersWithStories is already defined above


    const handleCreateStory = useCallback(async (storyData: Omit<Story, 'id' | 'timestamp' | 'expiresAt' | 'userId' | 'username' | 'userAvatar'>) => {
        if (!currentUser) return;
        
        try {
            const result = await apiClient.createStory(storyData.content, storyData.type);
            if (result.error) {
                console.error("Failed to create story via API:", result.error);
                return;
            }
            
            // Reload to get the new story properly
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to create story via API:", error);
        }
    }, [currentUser, reloadBackendData]);

    const handleViewStory = useCallback(async (storyId: string) => {
        if (!currentUser) return;
        
        // Optimistically update local state
        setStories(prevStories => prevStories.map(story => {
            if (story.id === storyId) {
                const viewers = story.viewers || [];
                if (!viewers.includes(currentUser.id || '')) {
                    return { ...story, viewers: [...viewers, currentUser.id || ''] };
                }
            }
            return story;
        }));

        try {
            await apiClient.viewStory(storyId);
        } catch (error) {
            console.error("Failed to view story via API:", error);
            // We could revert here, but for a view receipt it's probably fine to ignore failure
        }
    }, [currentUser]);

    const handleSendMessage = async (recipientUsername: string, text: string, senderUsername?: string) => {
        const sender = senderUsername || currentUser?.username;
        if (!sender || recipientUsername === sender) return;

        // MIGRATION: API Call
        try {
            const result = await apiClient.sendMessageToUser(recipientUsername, text);
            if (result.error) {
                console.error("Failed to send message via API:", result.error);
                return;
            }
            
            // Reload conversations to get the latest state
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to send message via API:", error);
        }
    };

    const handleCreateOrFindConversation = async (recipientUsername: string, options?: { isEncrypted?: boolean, selfDestructTimer?: number }): Promise<string> => {
        if (!currentUser) return '';
        
        // Try to find existing conversation first
        // If encrypted, we rely on the backend to give us the right ID or create a new one.
        // We can check local cache if we have encryption info.
        const isEncrypted = options?.isEncrypted || false;

        const existingConvo = conversationsRef.current.find(c => {
             const hasParticipant = c.participants.includes(recipientUsername);
             // Assume undefined isEncrypted means false
             const convoIsEncrypted = c.isEncrypted || false;
             return hasParticipant && convoIsEncrypted === isEncrypted;
        });
        
        if (existingConvo) {
            return existingConvo.id;
        }
        
        // If not found, create it via API
        try {
            const result = await apiClient.getOrCreateConversation(recipientUsername, options);
            if (result.data) {
                // Reload conversations to get the latest state
                await reloadBackendData();
                return result.data.conversationId || '';
            }
        } catch (error) {
            console.error("Failed to get or create conversation:", error);
        }
        
        return '';
    };

    const handleMarkConversationAsRead = async (conversationId: string) => {
        if (!currentUser) return;
        
        try {
            await apiClient.markConversationAsRead(conversationId);
            // Reload conversations to get updated unread counts
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to mark conversation as read:", error);
            // Fallback to local update
            setConversations(prev => prev.map(c => {
                if (c.id === conversationId) {
                    return { ...c, unreadCount: { ...c.unreadCount, [currentUser.username]: 0 } };
                }
                return c;
            }));
        }
    };
    
    const findPostById = (posts: Post[], postId: string): Post | null => {
        for (const post of posts) {
            if (post.id === postId) {
                return post;
            }
            if (post.replies) {
                const foundInReplies = findPostById(post.replies, postId);
                if (foundInReplies) return foundInReplies;
            }
            if (post.repostOf) {
                const foundInRepost = findPostById([post.repostOf], postId);
                if (foundInRepost) return foundInRepost;
            }
        }
        return null;
    };

    const checkForTriggers = (post: Post) => {
        // Feature removed
    };

    const monthSlugs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const formatDateSegment = (date: Date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
        const month = monthSlugs[date.getMonth()];
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
    };

    const parseDateSegment = (segment: string): Date | null => {
        const parts = segment.split('-');
        if (parts.length !== 3) return null;
        const [mmm, dd, yyyy] = parts;
        const monthIndex = monthSlugs.indexOf(mmm.toLowerCase());
        if (monthIndex === -1) return null;
        const day = parseInt(dd, 10);
        const year = parseInt(yyyy, 10);
        if (!day || !year) return null;
        const d = new Date(year, monthIndex, day);
        if (d.getFullYear() !== year || d.getMonth() !== monthIndex || d.getDate() !== day) return null;
        return d;
    };

    const updateUrlForPage = (page: Page, data?: string) => {
        if (typeof window === 'undefined' || !window.history || !window.location) return;

        let path = '/';

        switch (page) {
            case Page.Dashboard:
                if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
                    const today = new Date();
                    const isToday = today.toDateString() === selectedDate.toDateString();
                    const segment = formatDateSegment(selectedDate);
                    path = (isToday || !segment) ? '/echo' : `/echo/${segment}`;
                } else {
                    path = '/echo';
                }
                break;
            case Page.Profile: {
                const username = data || profileUsername || currentUser?.username;
                path = username ? `/@${encodeURIComponent(username)}` : '/profile';
                break;
            }
            case Page.Settings:
                path = '/settings';
                break;
            case Page.Messages:
                path = '/messages';
                break;
            case Page.VideoAnalysis:
                path = '/data-slicer';
                break;
            case Page.Login:
                path = '/login';
                break;
            case Page.Register:
                path = '/register';
                break;
            case Page.Verify:
                path = '/verify';
                break;
            case Page.ForgotPassword:
                path = '/forgot-password';
                break;
            case Page.ResetPassword:
                path = '/reset-password';
                break;
            case Page.Welcome:
            default:
                path = '/welcome';
                break;
        }

        const currentFullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const nextFullPath = `${path}${window.location.search}${window.location.hash}`;

        if (currentFullPath !== nextFullPath) {
            window.history.pushState({ page, data }, '', nextFullPath);
        }
    };

    const handleReply = async (parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }, actor?: User) => {
        const replier = actor || currentUser;
        if (!replier) return;
    
        // MIGRATION: API Call
        try {
            const result = await apiClient.replyToPost(parentPostId, content, isPrivate, media);
            if (result.error) {
                console.error("Failed to reply via API:", result.error);
                return;
            }
            
            if (replier.username === currentUser.username) {
                playSound('reply');
            }

            // Reload posts to get the updated state with the new reply
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to reply via API:", error);
        }
    };


    const handleNavigate = (page: Page, data?: string) => {
        if(page === Page.Profile && data) setProfileUsername(data);
        else setProfileUsername(null);

        if (page === Page.Verify && data) setUserToVerify(data);
        if (page === Page.ResetPassword && data) setEmailToReset(data);
        if (page === Page.Messages && data) sessionStorage.setItem('chrono_focus_conversation_user', data);
        
        setCurrentPage(page);
        // Save current page to sessionStorage for refresh persistence
        if (currentUser) {
            sessionStorage.setItem('chrono_currentPage', page.toString());
        }
        setAnimationKey(prev => prev + 1);
        updateUrlForPage(page, data);
    }
    
    const handleLogin = (user: User) => { 
        console.log('App.handleLogin called with:', user);
        setCurrentUser(user); 
        
        // Reset state to avoid conflicts
        setProfileUsername(null);
        
        const savedPage = sessionStorage.getItem('chrono_currentPage');
        let pageToNavigate = savedPage ? (parseInt(savedPage, 10) as Page) : Page.Dashboard;
        
        // Safety check: If navigating to Profile without context, default to own profile
        if (pageToNavigate === Page.Profile) {
            console.log('Restoring Profile page, defaulting to current user');
            setProfileUsername(user.username);
        }

        console.log('Navigating to:', pageToNavigate);
        setCurrentPage(pageToNavigate);
        sessionStorage.setItem('chrono_currentPage', pageToNavigate.toString());
    };
    
    const handleLogout = () => { 
        setCurrentUser(null); 
        setCurrentPage(Page.Welcome); 
        setPosts([]); 
        setConversations([]);
        sessionStorage.removeItem('chrono_currentPage');
        apiClient.setToken(null);
    };

    const handleUpdateUser = async (updatedUser: User): Promise<{ success: boolean; error?: string }> => {
        // Update local state immediately for responsive UI
        setUsers(prevUsers => {
            const exists = prevUsers.some(u => u.username === updatedUser.username);
            if (exists) {
                return prevUsers.map(u => u.username === updatedUser.username ? updatedUser : u);
            } else {
                return [...prevUsers, updatedUser];
            }
        });
        
        // Also update posts authored by this user locally to reflect avatar/bio changes immediately
        setPosts(prevPosts => prevPosts.map(post => {
            if (post.author.username === updatedUser.username) {
                // Keep existing author fields but overwrite with updated user details that are relevant for display
                return { 
                    ...post, 
                    author: { 
                        ...post.author, 
                        avatar: updatedUser.avatar,
                        bio: updatedUser.bio,
                        profileSettings: updatedUser.profileSettings,
                        verificationBadge: updatedUser.verificationBadge,
                        isVerified: updatedUser.isVerified
                    } 
                };
            }
            return post;
        }));

        if (currentUser?.username === updatedUser.username) {
            setCurrentUser(updatedUser);
        }
        
        // Save to backend
        if (currentUser?.username === updatedUser.username) {
            let attempt = 0;
            const maxAttempts = 3;
            let lastError = "Unknown error";

            while (attempt < maxAttempts) {
                try {
                    // Prefer profileSettings.coverImage if available (new upload), fallback to root coverImage
                    const coverImageToUse = updatedUser.profileSettings?.coverImage || updatedUser.coverImage;
                    
                    const updates: any = {
                        bio: updatedUser.bio,
                        avatar: updatedUser.avatar,
                        coverImage: coverImageToUse,
                        birthday: updatedUser.birthday,
                        location: updatedUser.location,
                        website: updatedUser.website,
                        pronouns: updatedUser.pronouns,
                        isPrivate: updatedUser.isPrivate,
                        profileSettings: updatedUser.profileSettings,
                    };
                    
                    const result = await apiClient.updateUser(updatedUser.username, updates);
                    if (result.error) {
                        lastError = result.error;
                        console.error(`Failed to update user via API (Attempt ${attempt + 1}/${maxAttempts}):`, result.error);
                        if (attempt === maxAttempts - 1) return { success: false, error: lastError };
                        attempt++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    
                    if (result.data) {
                        // Update with data from backend to ensure sync
                        const mappedUser = mapApiUserToUser(result.data);

                        // SAFEGUARD: If backend returns null/empty avatar but we had one, keep ours.
                        // This handles cases where backend update succeeded but didn't return the large field, or DB issue.
                        if (!mappedUser.avatar && updatedUser.avatar) {
                             console.warn("Backend returned empty avatar after update. Preserving local avatar.");
                             mappedUser.avatar = updatedUser.avatar;
                        }

                        setUsers(prevUsers => {
                            const exists = prevUsers.some(u => u.username === updatedUser.username);
                            if (exists) {
                                return prevUsers.map(u => u.username === updatedUser.username ? mappedUser : u);
                            } else {
                                return [...prevUsers, mappedUser];
                            }
                        });
                        
                        // Update posts again with confirmed backend data
                        setPosts(prevPosts => prevPosts.map(post => {
                            if (post.author.username === mappedUser.username) {
                                return { 
                                    ...post, 
                                    author: { 
                                        ...post.author, 
                                        avatar: mappedUser.avatar,
                                        bio: mappedUser.bio,
                                        profileSettings: mappedUser.profileSettings,
                                        verificationBadge: mappedUser.verificationBadge,
                                        isVerified: mappedUser.isVerified
                                    } 
                                };
                            }
                            return post;
                        }));

                        if (currentUser?.username === updatedUser.username) {
                            setCurrentUser(mappedUser);
                        }
                    }
                    return { success: true };
                } catch (error: any) {
                    lastError = error.message || "Network error";
                    console.error(`Failed to update user via API (Attempt ${attempt + 1}/${maxAttempts}):`, error);
                    if (attempt === maxAttempts - 1) return { success: false, error: lastError };
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return { success: false, error: lastError };
        }
        return { success: true }; // If not current user, assume success (local update only)
    };

    const handleFollowToggle = async (usernameToToggle: string, actor?: User) => {
         const follower = actor || currentUser;
         if (!follower) return;
        const isFollowing = follower.followingList?.includes(usernameToToggle);

        // Optimistic Update
        const updatedFollower = {
            ...follower,
            followingList: isFollowing
                ? follower.followingList?.filter(u => u !== usernameToToggle)
                : [...(new Set([...(follower.followingList || []), usernameToToggle]))], // Ensure uniqueness
            following: isFollowing ? Math.max(0, follower.following - 1) : follower.following + 1,
        };

        // Update local state immediately
        if (!actor) {
            setCurrentUser(updatedFollower);
        }

        setUsers(currentUsers =>
            currentUsers.map(u => {
                if (u.username === follower.username) {
                    return updatedFollower;
                }
                if (u.username === usernameToToggle) {
                    const targetUser = u;
                    const updatedTargetUser = {
                        ...targetUser,
                        followersList: isFollowing
                            ? targetUser.followersList?.filter(u => u !== follower.username)
                            : [...(new Set([...(targetUser.followersList || []), follower.username]))], // Ensure uniqueness
                        followers: isFollowing ? Math.max(0, targetUser.followers - 1) : targetUser.followers + 1,
                    };
                    return updatedTargetUser;
               }
                return u;
            })
        );

        // API Call
        try {
            if (follower.username === currentUser.username) {
                const result = isFollowing 
                    ? await apiClient.unfollowUser(usernameToToggle)
                    : await apiClient.followUser(usernameToToggle);

                if (result.error) {
                    console.error("Failed to toggle follow via API:", result.error);
                    // Revert optimistic update if API fails
                     setUsers(currentUsers =>
                        currentUsers.map(u => {
                            if (u.username === follower.username) return follower;
                             if (u.username === usernameToToggle) {
                                // Revert target user stats - ideally we would reload or revert carefully
                                // For now, just reload backend data to fix state
                                return u; 
                            }
                            return u;
                        })
                    );
                    if (!actor) setCurrentUser(follower); // Revert current user
                    await reloadBackendData(); // Force sync
                    return;
                }
                
                // Success: Reload backend data to ensure 100% consistency
                // We do NOT update local state again here manually because reloadBackendData will do it properly
                await reloadBackendData();
            }
        } catch (error) {
             console.error("Failed to toggle follow via API:", error);
             await reloadBackendData(); // Try to resync on error
        }
    };
    
    const simulateUserPostInteraction = (post: Post) => {
        if (!currentUser) return;
    
        const aiUsers = usersRef.current.filter(u => u.username !== currentUser.username && !CORE_USERS.some(cu => cu.username === u.username));
        if (aiUsers.length === 0) return;
    
        // Drastically reduced interaction for an "unknown" user feel.
    
        // Simulate 0 to 2 reactions, with a higher chance of 0.
        const reactionRoll = Math.random();
        let reactionCount = 0;
        if (reactionRoll > 0.5) { // 50% chance of any reactions
            reactionCount = Math.floor(Math.random() * 3); // 0, 1, or 2
        }

        for (let i = 0; i < reactionCount; i++) {
            setTimeout(() => {
                const reactor = aiUsers[Math.floor(Math.random() * aiUsers.length)];
                const reactions: CyberpunkReaction[] = ['Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'];
                const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                handleUpdateReaction(post.id, randomReaction, reactor);
            }, 3000 + Math.random() * 10000); // Stagger reactions a bit more
        }
    
        // Simulate 0 or 1 reply, with a low chance.
        const replyRoll = Math.random();
        if (replyRoll > 0.85) { // 15% chance of a reply
             const replyDelay = 7000 + Math.random() * 15000; // 7-22s delay
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

        // No echoes for an unknown user.
    };

    const handleNewPost = async (post: Post) => {
        // EchoFrame now calls the API, so 'post' here is the confirmed object from backend
        // Reload all posts to ensure we have the latest state from backend
        
        if (post.author.username === currentUser?.username) {
            playSound('post');
            showToast('Post publicado com sucesso!', 'success');
        }

        await reloadBackendData();
        
        // Check for triggers and simulate interactions
        checkForTriggers(post);
        if (post.author.username === currentUser?.username) {
            simulateUserPostInteraction(post);
        }
    };
    
    const handleUpdateReaction = async (postId: string, reaction: CyberpunkReaction, actor?: User) => {
        const reactor = actor || currentUser;
        if (!reactor) return;

        // MIGRATION: API Call
        try {
            const result = await apiClient.updateReaction(postId, reaction);
            if (result.error) {
                if (reactor.username === currentUser?.username) showToast(result.error, 'error');
                return;
            }
            
            // Reload posts to get updated reactions
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to update reaction via API:", error);
            if (reactor.username === currentUser?.username) showToast('Falha ao reagir ao post.', 'error');
        }
    };

    const handleEcho = async (postToEcho: Post, actor?: User) => {
        const echoer = actor || currentUser;
        if (!echoer) return;
        if (postToEcho.repostOf) return; // Prevent echoing an echo

        // MIGRATION: API Call
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

            // Reload posts to get the updated state with the new echo
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to echo post via API:", error);
            if (echoer.username === currentUser?.username) showToast('Falha ao ecoar post.', 'error');
        }
    };

    const handleDeletePost = async (postIdToDelete: string) => {
        if (!currentUser) return;

        // MIGRATION: API Call
        try {
            const result = await apiClient.deletePost(postIdToDelete);
            if (result.error) {
                showToast(result.error, 'error');
                return;
            }
            
            showToast('Post deletado.', 'info');
            // Reload posts to get updated state
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to delete post via API:", error);
            showToast('Falha ao deletar post.', 'error');
        }
    };

    const handleEditPost = async (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>) => {
         if (!currentUser) return;

         // MIGRATION: API Call
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
             // Reload posts to get updated state
             await reloadBackendData();
         } catch (error) {
             console.error("Failed to update post via API:", error);
             showToast('Falha ao atualizar post.', 'error');
         }
    };

     const handlePollVote = async (postId: string, optionIndex: number, actor?: User) => {
        const voter = actor || currentUser;
        if (!voter) return;

        // MIGRATION: API Call
        try {
            const result = await apiClient.votePoll(postId, optionIndex);
            if (result.error) {
                console.error("Failed to vote via API:", result.error);
                return;
            }
            
            // Reload posts to get updated poll votes
            await reloadBackendData();
        } catch (error) {
            console.error("Failed to vote via API:", error);
        }
    };

    const handlePasswordReset = (email: string, newPass: string) => {
        setUsers(prev => prev.map(u => u.email === email ? { ...u, password: newPass } : u));
        sessionStorage.setItem('chrono_login_message', 'Password reset successfully. Please log in.');
        handleNavigate(Page.Login);
    }
    
    // AI Interactions - DISABLED to keep the timeline clean
    /*
    useEffect(() => {
        // AI interaction logic removed for clarity and performance
    }, [currentUser]);
    */
    

    const handleNotificationClick = (notification: Notification) => {
        if (!currentUser) return;

        if (notification.post) {
            setSelectedDate(new Date(notification.post.timestamp));
            sessionStorage.setItem('chrono_focus_post_id', notification.post.id);
            handleNavigate(Page.Dashboard);
        } else if (notification.notificationType === 'follow') {
            handleNavigate(Page.Profile, notification.actor.username);
        }

        // Mark as read
        const updatedUser = {
            ...currentUser,
            notifications: currentUser.notifications?.map(n => n.id === notification.id ? { ...n, read: true } : n)
        };
        handleUpdateUser(updatedUser);
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

    const renderPage = () => {
        if (isSessionLoading) {
            return (
                <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
                     <div className="w-16 h-16 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-[var(--theme-primary)] font-mono animate-pulse">ESTABLISHING UPLINK...</p>
                </div>
            );
        }

        switch (currentPage) {
            case Page.Welcome:
                return <Welcome onNavigate={handleNavigate} />;
            case Page.Login:
                return <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />;
            case Page.Register:
                return <Register users={users} setUsers={setUsers} onNavigate={handleNavigate} onLogin={handleLogin} />;
            case Page.Verify:
                const userToVerifyEmail = users.find(u => u.username === userToVerify)?.email;
                return <Verify email={userToVerifyEmail || null} users={users} setUsers={setUsers} onNavigate={handleNavigate} />;
            case Page.ForgotPassword:
                return <ForgotPassword users={users} onNavigate={handleNavigate} />;
            case Page.ResetPassword:
                return <ResetPassword emailToReset={emailToReset} onPasswordReset={handlePasswordReset} onNavigate={handleNavigate} />;
            case Page.Dashboard:
                return currentUser ? (
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
                        newPostsCount={pendingPosts.length}
                        onShowNewPosts={handleShowNewPosts}
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
                        usersWithStories={usersWithStories}
                        onViewStory={setViewingStoryUser}
                        onCreateStory={() => setIsCreatingStory(true)}
                        onUpdateUser={handleUpdateUser}
                        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                        nextAutoRefresh={nextAutoRefresh}
                        isAutoRefreshPaused={isAutoRefreshPaused}
                    />
                ) : (
                    <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />
                );
            case Page.Profile:
                // Fallback to current user if profileUsername is missing but we are in Profile page
                const targetProfile = profileUsername || currentUser?.username;
                
                return currentUser && targetProfile ? (
                     <ProfilePage
                        currentUser={currentUser}
                        profileUsername={targetProfile}
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                        onNotificationClick={handleNotificationClick}
                        users={memoizedUsers}
                        onFollowToggle={handleFollowToggle}
                        allUsers={combinedUsers}
                        allPosts={memoizedPosts}
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
                        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                        onUpdateUser={handleUpdateUser}
                     />
                ) : (
                    <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />
                );
             case Page.Settings:
                return currentUser ? (
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
                    />
                ) : (
                    <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />
                );
            case Page.Messages:
                return currentUser ? (
                    <MessagesPage
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                        onNotificationClick={handleNotificationClick}
                        allUsers={combinedUsers}
                        allPosts={memoizedPosts}
                        conversations={conversations}
                        onSendMessage={handleSendMessage}
                        onMarkConversationAsRead={handleMarkConversationAsRead}
                        onCreateOrFindConversation={handleCreateOrFindConversation}
                        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    />
                ) : (
                    <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />
                );
             case Page.VideoAnalysis:
                return currentUser ? (
                    <DataSlicerPage
                        user={currentUser}
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                        onNotificationClick={handleNotificationClick}
                        allUsers={combinedUsers}
                        allPosts={memoizedPosts}
                        conversations={conversations}
                        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                    />
                ) : (
                    <LoginScreen onLogin={handleLogin} users={users} onNavigate={handleNavigate} />
                );
            default:
                return <Welcome onNavigate={handleNavigate} />;
        }
    };

    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
            
            const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, []);

    const activeTheme = currentUser?.profileSettings?.theme || systemTheme;
    const activeAccent = currentUser?.profileSettings?.accentColor || 'purple';
    const activeEffect = currentUser?.profileSettings?.effect || 'none';
    const activeSkin = currentUser?.profileSettings?.themeSkin || 'default';
    const animationsDisabled = !(currentUser?.profileSettings?.animationsEnabled ?? true);

    useEffect(() => {
        // Remove all theme and effect classes first
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.remove('accent-purple', 'accent-green', 'accent-amber', 'accent-red', 'accent-blue');
        document.body.classList.remove('effect-scanline', 'effect-glitch_overlay');
        document.body.classList.remove('animations-disabled');
        document.body.classList.remove('skin-retro-terminal', 'skin-midnight-city', 'skin-solar-punk');
        
        // Apply current theme and accent
        document.body.classList.add(`theme-${activeTheme}`);
        document.body.classList.add(`accent-${activeAccent}`);
        
        // Apply effect if not none (keep underscore as CSS uses it)
        if (activeEffect !== 'none') {
            document.body.classList.add(`effect-${activeEffect}`);
        }

        // Apply skin
        if (activeSkin !== 'default' && activeSkin) {
             document.body.classList.add(`skin-${activeSkin.toLowerCase().replace(/ /g, '-')}`);
        }
        
        // Apply animations disabled if needed
        if (animationsDisabled) {
            document.body.classList.add('animations-disabled');
        }
    }, [activeTheme, activeAccent, activeEffect, activeSkin, animationsDisabled]);

    console.log('App Render: currentPage:', currentPage, 'currentUser:', currentUser ? currentUser.username : 'null');

    return (
        <LanguageProvider>
            <div key={animationKey} className="page-transition">
                <Suspense fallback={<LoadingSpinner />}>
                    {renderPage()}
                    {viewingStoryUser && viewingStoryUser.stories && (
                        <StoryViewer
                            user={viewingStoryUser}
                            stories={viewingStoryUser.stories}
                            onClose={() => setViewingStoryUser(null)}
                            onViewStory={handleViewStory}
                            onNextUser={() => {
                                const currentIndex = usersWithStories.findIndex(u => u.username === viewingStoryUser.username);
                                if (currentIndex < usersWithStories.length - 1) {
                                    setViewingStoryUser(usersWithStories[currentIndex + 1]);
                                } else {
                                    setViewingStoryUser(null);
                                }
                            }}
                            onPrevUser={() => {
                                const currentIndex = usersWithStories.findIndex(u => u.username === viewingStoryUser.username);
                                if (currentIndex > 0) {
                                    setViewingStoryUser(usersWithStories[currentIndex - 1]);
                                } else {
                                    setViewingStoryUser(null);
                                }
                            }}
                        />
                    )}

                    {isCreatingStory && currentUser && (
                        <StoryCreator
                            currentUser={currentUser}
                            onClose={() => setIsCreatingStory(false)}
                            onSave={handleCreateStory}
                        />
                    )}
                    {isMarketplaceOpen && currentUser && (
                        <Marketplace
                            currentUser={currentUser}
                            onClose={() => setIsMarketplaceOpen(false)}
                            onUserUpdate={handleUpdateUser}
                        />
                    )}
                    

                </Suspense>
            </div>
        </LanguageProvider>
    );
}
