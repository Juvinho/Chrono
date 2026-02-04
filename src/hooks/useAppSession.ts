import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Story, Post, Conversation, Page, Notification } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { apiClient, mapApiUserToUser, mapApiStoryToStory, mapApiPostToPost } from '../api';
import { NotificationManager } from '../utils/notificationManager';

interface UseAppSessionProps {
    setStories: React.Dispatch<React.SetStateAction<Story[]>>;
    setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    playSound: (soundName: string) => void;
}

export const useAppSession = ({
    setStories,
    setPosts,
    setConversations,
    playSound
}: UseAppSessionProps) => {
    const navigate = useNavigate();
    
    // 1. Basic User State
    const [users, setUsers] = useLocalStorage<User[]>('chrono_users_v4', []); 
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('chrono_currentUser_v4', null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Refs
    const knownNotificationIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    // Helper function to reload data from backend
    const reloadBackendData = useCallback(async () => {
        // Use a ref-based check to avoid dependency on currentUser
        if (!apiClient.getToken()) return;
        
        try {
            // Reload current user to ensure follow counts and lists are accurate
            const userResult = await apiClient.getCurrentUser();
            if (userResult.data) {
                const mappedUser = mapApiUserToUser(userResult.data);
                
                // Reload notifications specifically for this update
                const notificationsResult = await apiClient.getNotifications();
                let finalNotifications = [];
                if (notificationsResult.data) {
                    finalNotifications = notificationsResult.data.map((n: any) => ({
                        ...n,
                        timestamp: new Date(n.timestamp || Date.now())
                    }));

                    finalNotifications.forEach((n: any) => {
                        if (!n.read && !knownNotificationIds.current.has(n.id)) {
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
                }

                // Update local storage and state using functional update
                setCurrentUser(prev => {
                    if (!prev) return mappedUser;
                    return {
                        ...mappedUser,
                        notifications: finalNotifications
                    };
                });
                
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
                    const x = acc.find((item: any) => item.id === current.id);
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
                        senderUsername: msg.senderUsername || 'unknown',
                        text: msg.text,
                        imageUrl: msg.imageUrl,
                        videoUrl: msg.videoUrl,
                        status: msg.status,
                        isEncrypted: msg.isEncrypted,
                        timestamp: new Date(msg.createdAt || msg.created_at || Date.now()),
                    })).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()),
                    lastMessageTimestamp: new Date(conv.lastMessageTimestamp || conv.updated_at || Date.now()),
                    unreadCount: conv.unreadCount || {},
                    isEncrypted: conv.isEncrypted,
                    selfDestructTimer: conv.selfDestructTimer
                }));
                setConversations(mappedConversations);
            }
            
            // Reload stories (grouped)
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
    }, [playSound, setStories, setPosts, setConversations, setCurrentUser, setUsers]);

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
    }, [setCurrentUser, setStories, setUsers]);

    const handleLogin = (user: User) => { 
        console.log('App.handleLogin called with:', user);
        setCurrentUser(user); 
        navigate('/echoframe');
    };
    
    const handleLogout = () => { 
        setCurrentUser(null); 
        setPosts([]); 
        setConversations([]);
        sessionStorage.removeItem('chrono_currentPage');
        apiClient.setToken(null);
        navigate('/welcome');
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
                        profileType: updatedUser.profileType,
                        headline: updatedUser.headline,
                        skills: updatedUser.skills,
                        workExperience: updatedUser.workExperience,
                        education: updatedUser.education,
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
            if (follower.username === currentUser?.username) {
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
                                return u; 
                            }
                            return u;
                        })
                    );
                    if (!actor) setCurrentUser(follower); // Revert current user
                    await reloadBackendData(); // Force sync
                    return;
                }
                
                await reloadBackendData();
            }
        } catch (error) {
             console.error("Failed to toggle follow via API:", error);
             await reloadBackendData(); // Try to resync on error
        }
    };

    return {
        users, setUsers,
        currentUser, setCurrentUser,
        isSessionLoading,
        reloadBackendData,
        handleLogin,
        handleLogout,
        handleUpdateUser,
        handleFollowToggle
    };
};
