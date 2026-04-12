import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Page, Post, CyberpunkReaction, Notification, Conversation } from '../../../types/index';
import PostCard from '../../timeline/components/PostCard';
import Header from '../../../components/ui/Header';
import Timeline from '../../timeline/components/Timeline';
import { PostComposer } from '../../timeline/components/PostComposer';
import { isSameDay } from '../../../utils/date';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSound } from '../../../contexts/SoundContext';
import { useToast } from '../../../contexts/ToastContext';
import { useChatStore } from '../../messaging/components/FloatingChatManager';
import { initConversation } from '../../messaging/api/messagingApi';
import type { Conversation as MessagingConversation } from '../../messaging/types';
import UserListModal from '../../../components/ui/UserListModal';
import { VerifiedIcon, MessageIcon, PaperPlaneIcon } from '../../../components/ui/icons';
import FramePreview, { getFrameShape } from './FramePreview';
import Avatar from './Avatar';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Error404 } from '../../../components/ErrorPages';
import { apiClient, mapApiPostToPost } from '../../../api';
import { TagBadgeGroup } from '../../../components/ui/TagBadge';
import { useUserTags } from '../../../hooks/useTags';
import { ProfileBioSidebar } from '../../../components/ProfileBioSidebar';
import { postIdMapper } from '../../../utils/postIdMapper';

interface ProfilePageProps {
  currentUser: User;
  profileUsername?: string;
  onLogout: () => void;
  onNavigate: (page: Page, username?: string) => void;
  onNotificationClick: (notification: Notification) => void;
  onViewNotifications: () => void;
  users: User[];
  onFollowToggle: (username: string) => void;
  allPosts: Post[];
  allUsers: User[];
  onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
  onReply: (parentPostId: string, content: string, isPrivate: boolean) => void;
  onEcho: (postToEcho: Post) => void;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, newPostData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>) => void;
  onPollVote: (postId: string, optionIndex: number) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  typingParentIds: Set<string>;
  conversations: Conversation[];
  onOpenMarketplace?: () => void;
  onOpenChat?: () => void;
  onBack?: () => void;
  lastViewedNotifications?: Date | null;
}

export default function ProfilePage({ 
  currentUser, profileUsername: propProfileUsername, onLogout, onNavigate, onNotificationClick, onViewNotifications, users, onFollowToggle, 
  allPosts, allUsers, conversations, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost,
  onPollVote, selectedDate, setSelectedDate, typingParentIds, onOpenMarketplace, onOpenChat, 
  onUpdateUser, onBack, lastViewedNotifications
}: ProfilePageProps & { onUpdateUser?: (user: User) => Promise<{ success: boolean; error?: string }> }) {
  const { t } = useTranslation();
  const { playSound } = useSound();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const openChat = useChatStore((state) => state.openChat);
  const closeChat = useChatStore((state) => state.closeChat);
  const openChats = useChatStore((state) => state.openChats);
  const { username: routeUsername } = useParams<{ username: string }>();
  
  // Determine the profile username to display:
  // 1. From URL param (e.g. /@Juvinho)
  // 2. From prop (legacy or direct usage)
  // 3. Fallback to current user if nothing else
  const profileUsername = routeUsername || propProfileUsername || currentUser.username;
  const isOwnProfile = profileUsername === currentUser.username;

  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userListModal, setUserListModal] = useState<{title: string, users: User[], currentUserFollowing: string[]} | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'temporal' | 'professional'>('posts');

  const handleTabChange = (tab: 'posts' | 'media' | 'temporal' | 'professional') => {
    setActiveTab(tab);
  };
  const [visiblePostsCount, setVisiblePostsCount] = useState(10);
  
  const followButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [cachedDirectConversations, setCachedDirectConversations] = useState<Record<string, MessagingConversation>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  
  // Memoize foundUser to avoid unnecessary recalculations
  const foundUser = useMemo(() => {
      if (isOwnProfile) return currentUser;
      return allUsers.find(u => u.username.toLowerCase() === profileUsername.toLowerCase()) 
          || users.find(u => u.username.toLowerCase() === profileUsername.toLowerCase());
  }, [isOwnProfile, currentUser, allUsers, users, profileUsername]);
  
  // Ensure fetchedUser matches the requested profileUsername
  const effectiveFetchedUser = fetchedUser && fetchedUser.username.toLowerCase() === profileUsername.toLowerCase() ? fetchedUser : null;
  
  // Prioritize API data (effectiveFetchedUser) over local state (foundUser) for other users
  // This ensures we display the most up-to-date profile data
  const profileUser = isOwnProfile ? currentUser : (effectiveFetchedUser || foundUser);

  // Load user tags - NOW it's safe to use profileUser
  const { tags: userTags } = useUserTags(profileUser?.id || null);

  // Lazy load EditProfileModal
  const EditProfileModal = useMemo(() => React.lazy(() => import('./EditProfileModal')), []);

  // DEBUG: Log data sources for troubleshooting inconsistencies
  useEffect(() => {
    if (profileUser) {
      const dataSource = isOwnProfile ? 'currentUser' : (effectiveFetchedUser ? 'API' : 'localCache');
      console.log(`[ProfilePage] Username: @${profileUser.username} | Followers: ${profileUser.followers} | Source: ${dataSource}`);
      
      // SAFEGUARD: Warn if we're using cache when API data is available
      if (!isOwnProfile && foundUser && effectiveFetchedUser && foundUser.followers !== effectiveFetchedUser.followers) {
        console.warn(`⚠️ [ProfilePage] Data mismatch detected for @${profileUser.username}:`, {
          localCache: foundUser.followers,
          apiData: effectiveFetchedUser.followers,
          using: 'API (correct)'
        });
      }
    }
  }, [profileUser, effectiveFetchedUser, isOwnProfile, foundUser]);

  useEffect(() => {
    // Scroll to top whenever the viewed profile changes
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Reset fetched user and posts when profile username changes
    if (fetchedUser && fetchedUser.username.toLowerCase() !== profileUsername.toLowerCase()) {
        setFetchedUser(null);
        setFetchError(null);
        setProfilePosts([]);
    }

    // CRITICAL FIX: Always fetch profile data from API for non-own profiles
    // Local data in allUsers/users can be stale (followers/following change in other tabs)
    // API is the source of truth - must prioritize it
    // Only skip fetch if we're viewing our own profile (always use currentUser)
    if (!isOwnProfile && profileUsername && !effectiveFetchedUser) {
        setIsLoadingUser(true);
        setFetchError(null);
        
        apiClient.getUser(profileUsername)
            .then(response => {
                if (response.data) {
                    setFetchedUser(response.data);
                } else {
                    setFetchError(response.error || "User not found");
                }
            })
            .catch(err => {
                console.error("Error fetching user profile:", err);
                setFetchError(err.message || "Failed to load user profile");
            })
            .finally(() => {
                setIsLoadingUser(false);
            });
    }
  }, [profileUsername, isOwnProfile, effectiveFetchedUser]);

  // Fetch posts for this profile directly from the API using the user's ID
  useEffect(() => {
    if (!profileUser?.id) return;
    let cancelled = false;
    setIsLoadingPosts(true);
    apiClient.getPosts({ author: profileUser.id, limit: 100 })
      .then(response => {
        if (cancelled) return;
        // Backend returns { posts: [...] } — extract the array
        const postsArr = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.posts)
            ? (response.data as any).posts
            : null;
        if (postsArr) {
          setProfilePosts(postsArr.map(mapApiPostToPost));
        } else {
          // Fallback: filter from allPosts if API call fails
          setProfilePosts(allPosts.filter(p => p.author?.username === profileUser.username));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfilePosts(allPosts.filter(p => p.author?.username === profileUser.username));
        }
      })
      .finally(() => { if (!cancelled) setIsLoadingPosts(false); });
    return () => { cancelled = true; };
  }, [profileUser?.id]);

  // Load follow status from API (checks if current user follows this profile)
  useEffect(() => {
    if (isOwnProfile || !profileUsername) {
      setIsFollowing(false);
      return;
    }

    const loadFollowStatus = async () => {
      try {
        const response = await apiClient.getUser(profileUsername);
        // Check if the fetched profile includes isFollowing from the API
        if (response.data?.isFollowing !== undefined) {
          setIsFollowing(response.data.isFollowing);
        } else {
          // Fallback to checking currentUser's followingList
          setIsFollowing(currentUser.followingList?.includes(profileUsername) || false);
        }
      } catch (error) {
        console.error('Error loading follow status:', error);
        // Fallback to currentUser's followingList on error
        setIsFollowing(currentUser.followingList?.includes(profileUsername) || false);
      }
    };

    loadFollowStatus();
  }, [profileUsername, isOwnProfile, currentUser.followingList]);

  // Force image reload when avatar or cover changes (cache buster)
  useEffect(() => {
    setImageCacheBuster(Date.now());
  }, [profileUser?.avatar, profileUser?.coverImage, profileUser?.profileSettings?.coverImage]);

  // Initialize isBlocked from currentUser's blockedUsers
  useEffect(() => {
    if (profileUser && !isOwnProfile && currentUser.blockedUsers) {
      setIsBlocked(currentUser.blockedUsers.includes(profileUser.id));
    }
  }, [profileUser, currentUser, isOwnProfile]);

  // Refresh the user list modal when currentUser's followingList changes (Item #1 fix)
  useEffect(() => {
    if (userListModal) {
      setUserListModal(prev => {
        if (!prev) return prev;
        // Update the currentUserFollowing list when the current user's following list changes
        return {
          ...prev,
          currentUserFollowing: currentUser.followingList || []
        };
      });
    }
  }, [currentUser.followingList]);

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  useEffect(() => {
      if (typeof window === 'undefined' || !profileUser) return;
      const path = window.location.pathname || '/';
      const segments = path.split('/').filter(Boolean);
      const expectedBase = `@${profileUser.username}`;

      if (segments.length >= 1 && segments[0] === expectedBase) {
          if (segments.length >= 2) {
              const tabSegment = segments[1];
              if (tabSegment === 'media') {
                  setActiveTab('media');
                  return;
              }
              if (tabSegment === 'temporal') {
                  setActiveTab('temporal');
                  return;
              }
              if (tabSegment === 'professional') {
                  // Only allow professional tab if user has professional profile enabled
                  if (profileUser.profileType === 'professional') {
                    setActiveTab('professional');
                  } else {
                    onNavigate(Page.Dashboard);
                  }
                  return;
              }
          }
          setActiveTab('posts');
      }
  }, [profileUser?.username, profileUser?.profileType, onNavigate]);

  const filteredPosts = useMemo(() => {
      if (!profileUser) return [];
      let posts = [...profilePosts];

      if (activeTab === 'temporal') {
          posts = posts.filter(p => isSameDay(new Date(p.timestamp), selectedDate));
      } else if (activeTab === 'media') {
          posts = posts.filter(p => p.imageUrl || p.videoUrl);
      }

      return posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [profilePosts, selectedDate, activeTab]);

  // Calculate best posts sorted by total reactions
  const bestPosts = useMemo(() => {
    if (!profilePosts) return [];
    
    return [...profilePosts]
      .map(post => {
        const totalReactions = Object.values(post.reactions || {}).reduce((sum, count) => sum + (count || 0), 0);
        const reposts = post.reposts || 0;
        const likes = post.likes || 0;
        const totalEngagement = likes + (totalReactions || 0) + reposts;
        return { post, totalEngagement };
      })
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .map(({ post }) => post);
  }, [profilePosts]);

  if (!profileUser) {
      if (isLoadingUser) {
          return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)]">
                  <LoadingSpinner />
                  <p className="mt-4 text-[var(--theme-primary)] font-mono animate-pulse">{t('loadingProfile')}</p>
              </div>
          );
      }
      if (fetchError) {
           return <Error404 onNavigate={() => onNavigate(Page.Dashboard)} />;
      }
      // Fallback loading
      return <LoadingSpinner />;
  }

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };
  
   const handleTagClick = (tag: string) => {
    sessionStorage.setItem('chrono_search_query', tag);
    onNavigate(Page.Dashboard);
  };
  
  const handleNavigateToPost = (postId: string) => {
    const randomId = postIdMapper.getRandomId(postId);
    navigate(`/post/${randomId}`);
  };
  
  const handleFollowClick = async () => {
    if (isFollowLoading || isOwnProfile) return; // Prevent double-click and self-follow
    
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // UNFOLLOW
        await apiClient.unfollowUser(profileUser.username);
        setIsFollowing(false);
        playSound('notification');
        showToast('Deixado de seguir', 'success');
        if (fetchedUser) {
          setFetchedUser({
            ...fetchedUser,
            followers: Math.max(0, (fetchedUser.followers || 0) - 1)
          });
        }
      } else {
        // FOLLOW
        await apiClient.followUser(profileUser.username);
        setIsFollowing(true);
        playSound('notification');
        showToast('Seguindo', 'success');
        if (fetchedUser) {
          setFetchedUser({
            ...fetchedUser,
            followers: (fetchedUser.followers || 0) + 1
          });
        }
      }
      
      // Trigger parent component update
      onFollowToggle(profileUser.username);
      
      // Add pulse animation
      if (followButtonRef.current) {
        followButtonRef.current.classList.add('pulse-click');
        setTimeout(() => followButtonRef.current?.classList.remove('pulse-click'), 400);
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar follow:', error);
      const errorMsg = error?.message || 'Erro ao atualizar follow';
      showToast(errorMsg, 'error');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!profileUser || !currentUser) {
      console.error('❌ Missing profileUser or currentUser');
      return;
    }

    const profileUserKey = String(profileUser.username || '').toLowerCase();
    const profileUserId = String(profileUser.id || '').trim();

    // Toggle behavior: if this user's chat is already open, close it.
    const existingOpenChat = openChats.find((chat) => {
      const chatUsername = String(chat.otherUser?.username || '').toLowerCase();
      const chatUserId = String(chat.otherUser?.id || '').trim();

      return chatUsername === profileUserKey || (!!profileUserId && chatUserId === profileUserId);
    });

    if (existingOpenChat) {
      closeChat(existingOpenChat.id);
      return;
    }

    // Reopen from cache to avoid unnecessary init requests on repeated toggles.
    const cachedConversation = cachedDirectConversations[profileUserKey];
    if (cachedConversation) {
      const stillExists = conversations.some((conversation) => String(conversation.id) === String(cachedConversation.id));
      if (!stillExists) {
        console.warn('⚠️ Conversa em cache está desatualizada. Recriando conversa...', {
          cachedId: cachedConversation.id,
          profileUser: profileUser.username,
        });
        setCachedDirectConversations((prev) => {
          const next = { ...prev };
          delete next[profileUserKey];
          return next;
        });
      } else {
        openChat(cachedConversation);
        return;
      }
    }
    
    try {
      console.log('📨 Abrindo mini-chat para:', {
        profileUserName: profileUser.username,
        profileUserId: profileUser.id,
        currentUserId: currentUser.id
      });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let targetUserId = String(profileUser.id ?? '').trim();

      // Some cached profiles can carry stale/non-UUID ids; fetch canonical id before init.
      if (!uuidRegex.test(targetUserId)) {
        console.warn('⚠️ profileUser.id inválido para chat init, buscando ID canônico:', targetUserId);
        const canonicalRes = await apiClient.getUser(profileUser.username);
        const canonicalId = String((canonicalRes.data as any)?.id ?? '').trim();

        if (!canonicalId || !uuidRegex.test(canonicalId)) {
          throw new Error('Não foi possível identificar o usuário para iniciar o chat.');
        }

        targetUserId = canonicalId;
      }

      if (String(currentUser.id).trim() === targetUserId) {
        throw new Error('Não é possível iniciar chat com o próprio usuário.');
      }
      
      // Call messagingApi to init/get conversation
      console.log('🔄 Chamando initConversation...');
      const conversation = await initConversation(targetUserId);
      
      console.log('✅ Conversa obtida:', {
        conversationId: conversation.id,
        hasOtherUser: !!conversation.otherUser,
        otherUserId: conversation.otherUser?.id
      });
      
      if (!conversation.id) {
        throw new Error('Conversa não tem ID');
      }
      
      const floatingConversation: MessagingConversation = {
        id: conversation.id,
        otherUser: conversation.otherUser || {
          id: profileUser.id,
          username: profileUser.username,
          displayName: profileUser.username,
          avatarUrl: profileUser.avatar || null,
        },
        lastMessage: conversation.lastMessage || null,
        unreadCount: conversation.unreadCount || 0,
        updatedAt: conversation.updatedAt || new Date().toISOString()
      };
      
      console.log('✅ Estrutura final do chat:', floatingConversation);

      setCachedDirectConversations((prev) => ({
        ...prev,
        [profileUserKey]: floatingConversation,
      }));
      
      // Open floating chat
      openChat(floatingConversation);
      console.log('✅ Mini-chat aberto com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao abrir mini-chat:', error);
      showToast('Erro ao abrir chat: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  };

  const handleBlockUser = async () => {
    if (!profileUser) return;
    setShowProfileMenu(false);
    try {
      if (isBlocked) {
        const res = await apiClient.request(`/users/${profileUser.username}/block`, { method: 'DELETE' });
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          setIsBlocked(false);
          showToast(`@${profileUser.username} desbloqueado.`, 'info');
        }
      } else {
        const res = await apiClient.request(`/users/${profileUser.username}/block`, { method: 'POST' });
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          setIsBlocked(true);
          showToast(`@${profileUser.username} bloqueado.`, 'success');
        }
      }
    } catch {
      showToast('Erro ao bloquear/desbloquear usuário.', 'error');
    }
  };

  const handleReportUser = async () => {
    if (!profileUser || !reportReason) return;
    try {
      const res = await apiClient.request('/reports', {
        method: 'POST',
        body: JSON.stringify({ reportedUserId: profileUser.id, reason: reportReason, description: reportDescription }),
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Denúncia enviada com sucesso!', 'success');
      }
    } catch {
      showToast('Erro ao enviar denúncia.', 'error');
    }
    setShowReportUserModal(false);
    setReportReason('');
    setReportDescription('');
  };

    const handlePostSubmit = (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf' | 'likes' | 'likedBy'>, existingPostId?: string) => {
        if (existingPostId) {
        onEditPost(existingPostId, {
          ...postData,
          likes: postToEdit?.likes ?? 0,
          likedBy: postToEdit?.likedBy ?? [],
        });
        }
        setPostToEdit(null);
    };

  const canViewPosts = !profileUser.isPrivate || isFollowing || isOwnProfile;
  
  const getFullUsersFromList = (usersOrUsernames: (string | User)[] = []) => {
      if (!usersOrUsernames || usersOrUsernames.length === 0) return [];
      
      return usersOrUsernames.map(item => {
          if (typeof item === 'string') {
              // If it's a string, try to find it in allUsers
              return allUsers.find(u => u.username === item);
          }
          // If it's already an object, return it
          return item;
      }).filter(Boolean) as User[];
  }

  const handleOpenUserList = async (type: 'followers' | 'following') => {
    if (!profileUser) return;

    const title = type === 'followers' ? t('profileFollowers') : t('profileFollowing');
    const rawList = type === 'followers' ? profileUser.followersList : profileUser.followingList;
    const count = type === 'followers' ? (profileUser.followers || 0) : (profileUser.following || 0);

    // Fetch current user's live following list from API so the follow button state is accurate
    let liveFollowingList: string[] = [];
    if (currentUser) {
      try {
        const meRes = await apiClient.getUser(currentUser.username);
        const following = meRes.data?.followingList;
        if (Array.isArray(following)) {
          liveFollowingList = following.map((u: any) =>
            typeof u === 'string' ? u : u?.username
          ).filter(Boolean);
        }
      } catch {
        // non-critical; fall through with empty list
      }
    }

    // If the count is 0, show empty list immediately
    if (count === 0) {
        setUserListModal({ title, users: [], currentUserFollowing: liveFollowingList });
        return;
    }

    // Fetch the profile user's followers/following list fresh from API
    try {
        const response = await apiClient.getUser(profileUser.username);

        if (response.data) {
            const freshList = type === 'followers' ? response.data.followersList : response.data.followingList;
            setUserListModal({ title, users: freshList || [], currentUserFollowing: liveFollowingList });
        } else {
            setUserListModal({ title, users: [], currentUserFollowing: liveFollowingList });
        }
    } catch (e) {
        console.error('[ProfilePage] Error fetching user list:', e);
        const fallback = getFullUsersFromList(rawList || []);
        setUserListModal({ title, users: fallback, currentUserFollowing: liveFollowingList });
    }
  };

  const borderRadius = profileUser.profileSettings?.borderRadius || 'md';
  const getRadiusClass = (type: 'avatar' | 'container' | 'button') => {
      if (type === 'avatar') {
          return borderRadius === 'full' ? 'rounded-full' : 
                 borderRadius === 'lg' ? 'rounded-2xl' : 
                 borderRadius === 'md' ? 'rounded-xl' : 
                 borderRadius === 'sm' ? 'rounded-lg' : 'rounded-none';
      }
      return borderRadius === 'full' ? 'rounded-3xl' : 
             borderRadius === 'lg' ? 'rounded-xl' : 
             borderRadius === 'md' ? 'rounded-lg' : 
             borderRadius === 'sm' ? 'rounded-sm' : 'rounded-none';
  };
  
  const avatarShape = profileUser?.equippedFrame ? getFrameShape(profileUser.equippedFrame.name) : getRadiusClass('avatar');

  if (isLoadingUser && !profileUser) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)]">
            <LoadingSpinner/>
            <p className="mt-4 text-[var(--theme-text-secondary)] animate-pulse">LOCATING SIGNAL...</p>
        </div>
    );
  }

  if (!profileUser) {
    return (
        <div className="h-screen w-screen flex flex-col">
             <Header 
                user={currentUser} 
                onLogout={onLogout} 
                onViewProfile={(username) => onNavigate(Page.Profile, username)} 
                onNavigate={onNavigate}
                onNotificationClick={onNotificationClick}
                onViewNotifications={onViewNotifications}
                onSearch={handleSearch} 
                allPosts={allPosts} 
                allUsers={allUsers}
                conversations={conversations}
                onOpenMarketplace={onOpenMarketplace}
                onOpenChat={onOpenChat}
                onBack={onBack}
                lastViewedNotifications={lastViewedNotifications}
            />
            <div className="flex-grow flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-red-500 glitch-effect" data-text="NÃO FOI POSSÍVEL ACHAR ESSE USUÁRIO, SERÁ QUE ELE ESTÁ VOANDO POR AI?">NÃO FOI POSSÍVEL ACHAR ESSE USUÁRIO, SERÁ QUE ELE ESTÁ VOANDO POR AI?</h2>
                    <p className="text-[var(--theme-text-secondary)]">{fetchError || "The requested timeline could not be found."}</p>
                    <button onClick={() => onNavigate(Page.Dashboard)} className="px-4 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] rounded transition-colors">
                        RETURN TO DASHBOARD
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header 
          user={currentUser} 
          onLogout={onLogout} 
          onViewProfile={(username) => onNavigate(Page.Profile, username)} 
          onNavigate={onNavigate}
          onNotificationClick={onNotificationClick}
          onViewNotifications={onViewNotifications}
          onSearch={handleSearch} 
          allPosts={allPosts} 
          allUsers={allUsers} 
          conversations={conversations}
          onOpenMarketplace={onOpenMarketplace}
          onOpenChat={onOpenChat}
          onBack={onBack}
          lastViewedNotifications={lastViewedNotifications}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className={`max-w-4xl mx-auto w-full px-4 md:px-0 ${borderRadius === 'none' ? '' : 'my-4'} animate-fade-in`}>
          <div className={`relative ${getRadiusClass('container')} shadow-lg`}>
            <div className={`relative h-48 md:h-64 w-full overflow-hidden ${getRadiusClass('container')}`} key={`cover-${imageCacheBuster}`}>
                <Avatar 
                  src={profileUser.coverImage ? `${profileUser.coverImage}${profileUser.coverImage.includes('data:') ? '' : `?t=${imageCacheBuster}`}` : (profileUser.profileSettings?.coverImage ? `${profileUser.profileSettings.coverImage}${profileUser.profileSettings.coverImage.includes('data:') ? '' : `?t=${imageCacheBuster}`}` : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80')} 
                  username={profileUser.username}
                  width={1200}
                  height={400}
                  className="w-full h-full object-cover"
                />
            </div>
            <div className="absolute -bottom-16 left-4 md:left-8 flex items-end z-10">
                <div className="relative w-24 h-24">
                    <img 
                        src={profileUser.avatar ? (profileUser.avatar.includes('data:') ? profileUser.avatar : `${profileUser.avatar}?t=${imageCacheBuster}`) : 'https://placehold.co/150'}
                        alt={profileUser.username}
                        width={96}
                        height={96}
                        className={`w-full h-full ${avatarShape} object-cover`}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/150'; }}
                        key={`avatar-${imageCacheBuster}`}
                    />
                    {profileUser.equippedFrame && (
                        <div className="absolute -inset-1 z-20 pointer-events-none">
                            <FramePreview item={profileUser.equippedFrame} />
                        </div>
                    )}
                    {profileUser.equippedEffect && profileUser.equippedEffect.imageUrl && (
                        <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                            <img 
                                src={profileUser.equippedEffect.imageUrl} 
                                alt="" 
                                className="w-full h-full object-cover"
                                width={96}
                                height={96}
                            />
                        </div>
                    )}
                </div>
            </div>
          </div>
          <div className={`pt-20 px-4 md:px-8 pb-6 md:pb-8 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] mt-[-1px] ${getRadiusClass('container')} relative z-0`}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div>
                <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-[var(--theme-text-light)]">@{profileUser.username}</h1>
                    {profileUser.isVerified && profileUser.verificationBadge && (
                        <div className="flex items-center">
                            {profileUser.verificationBadge.label === 'Criador' && profileUser.verificationBadge.color === 'red' ? (
                                <span 
                                    className="bg-[#ff003c] text-white text-[10px] px-2 py-0.5 rounded-sm font-bold flex items-center uppercase tracking-tighter shadow-[0_0_10px_rgba(255,0,60,0.5)] border border-[#ff4d7a] animate-pulse"
                                    title="Verificado: Criador do Sistema"
                                >
                                    Criador
                                </span>
                            ) : (
                                <VerifiedIcon 
                                    className="w-6 h-6 animate-pulse-soft"
                                    style={{ color: profileUser.verificationBadge.color }}
                                    title={profileUser.verificationBadge.label}
                                />
                            )}
                        </div>
                    )}
                    {profileUser.pronouns && (
                        <span className="text-sm text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded-full">{profileUser.pronouns}</span>
                    )}
                </div>
                {profileUser.profileType === 'professional' && profileUser.headline && (
                  <p className="text-lg text-[var(--theme-primary)] font-semibold mt-1">{profileUser.headline}</p>
                )}
                {profileUser.bio && (
                  <div className="text-[var(--theme-text-primary)] mt-2 whitespace-pre-wrap break-words">
                      {(() => {
                          const urlRegex = /(https?:\/\/[^\s]+)/g;
                          const parts = profileUser.bio.split(urlRegex);
                          return parts.map((part, i) => {
                              if (part.match(urlRegex)) {
                                  return (
                                      <a 
                                        key={i} 
                                        href={part} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[var(--theme-primary)] hover:underline break-all"
                                      >
                                          {part}
                                      </a>
                                  );
                              }
                              return part;
                          });
                      })()}
                  </div>
                )}
                {/* Tags/Badges Display */}
                {userTags && userTags.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--theme-border-secondary)]">
                    <TagBadgeGroup tags={userTags} maxVisible={5} size="sm" />
                  </div>
                )}
                {profileUser.birthday && (
                  <p className="text-sm text-[var(--theme-text-secondary)] mt-1">{t('profileBirthday')}: {(() => {
                    try {
                      // Handle both ISO strings and YYYY-MM-DD strings safely without timezone shifts
                      const datePart = profileUser.birthday.split('T')[0];
                      const [year, month, day] = datePart.split('-');
                      if (year && month && day) return `${day}/${month}/${year}`;
                      return new Date(profileUser.birthday).toLocaleDateString();
                    } catch (e) {
                      return profileUser.birthday;
                    }
                  })()}</p>
                )}
                {profileUser.createdAt && (
                  <p className="text-sm text-[var(--theme-text-secondary)] mt-1 flex items-center">
                    <span className="mr-1">📅</span> Entrou em {(() => {
                        try {
                            const date = new Date(profileUser.createdAt);
                            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        } catch (e) {
                            return '';
                        }
                    })()}
                  </p>
                )}
                {profileUser.location && (
                  <p className="text-sm text-[var(--theme-text-secondary)] mt-1 flex items-center">
                    <span className="mr-1">📍</span> {profileUser.location}
                  </p>
                )}
                {profileUser.website && (
                  <p className="text-sm text-[var(--theme-text-secondary)] mt-1 flex items-center">
                    <span className="mr-1">🔗</span> 
                    <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--theme-primary)] hover:underline">
                      {profileUser.website}
                    </a>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onNavigate(Page.Dashboard)} className="back-to-echo-btn hidden md:flex">
                      &lt; {t('backToEchoFrame')}
                  </button>
                  {isOwnProfile ? (
                      <button 
                          onClick={() => setIsEditProfileOpen(true)}
                          className="px-4 py-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] text-[var(--theme-text-primary)] rounded-sm transition-colors flex items-center"
                      >
                          <span className="mr-2">✎</span> {t('editProfile')}
                      </button>
                  ) : (
                    <>
                      <button 
                        onClick={handleSendMessage}
                        className="follow-btn px-4 py-1 rounded-sm transition-colors flex items-center gap-2" 
                        title={t('messageButton') || 'Enviar Mensagem'}
                      >
                        <PaperPlaneIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">{t('messageButton') || 'Enviar Mensagem'}</span>
                      </button>
                      <button 
                        ref={followButtonRef} 
                        onClick={handleFollowClick}
                        disabled={isFollowLoading}
                        onMouseEnter={() => setIsHoveringFollow(true)}
                        onMouseLeave={() => setIsHoveringFollow(false)}
                        className={`px-4 py-1 rounded-sm transition-all duration-200 font-medium ${
                          isFollowLoading ? 'opacity-60 cursor-not-allowed' : ''
                        } ${
                          isFollowing
                            ? isHoveringFollow
                              ? 'bg-red-400 bg-opacity-20 text-red-400 border border-red-400'
                              : 'bg-transparent border border-[var(--theme-border-primary)] text-[var(--theme-text-primary)]'
                            : 'bg-[var(--theme-primary)] text-white border border-[var(--theme-primary)]'
                        }`}
                      >
                        {isFollowLoading 
                          ? '...' 
                          : isFollowing 
                            ? (isHoveringFollow ? 'Deixar de Seguir' : 'Seguindo')
                            : 'Seguir'
                        }
                      </button>
                      <div className="relative" ref={profileMenuRef}>
                        <button 
                          onClick={() => setShowProfileMenu(prev => !prev)}
                          className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          title="Opções"
                        >
                          ⋯
                        </button>
                        {showProfileMenu && (
                          <div className="absolute top-full right-0 mt-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded z-20 w-44 animate-[fadeIn_0.15s_ease-in-out]">
                            <button 
                              onClick={handleBlockUser}
                              className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-[var(--theme-border-primary)]"
                            >
                              <span>{isBlocked ? '✅ Desbloquear' : '🚫 Bloquear'}</span>
                            </button>
                            <button 
                              onClick={() => { setShowReportUserModal(true); setShowProfileMenu(false); }}
                              className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[var(--theme-border-primary)]"
                            >
                              <span>🚩 Denunciar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 text-[var(--theme-text-secondary)]">
              <button onClick={() => handleOpenUserList('followers')}>
                  <span className="font-bold text-[var(--theme-text-light)]">{profileUser.followers}</span> {t('profileFollowers')}
                </button>
                <button onClick={() => handleOpenUserList('following')}>
                  <span className="font-bold text-[var(--theme-text-light)]">{profileUser.following}</span> {t('profileFollowing')}
                </button>
            </div>
          </div>
          
          <div className="mt-4 px-4 md:px-8 pb-8 w-full mx-auto max-w-4xl overflow-x-hidden overflow-y-visible" style={{ boxSizing: 'border-box' }}>
            <div className="w-full overflow-hidden" style={{ boxSizing: 'border-box' }}>
              <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-4 lg:gap-6 w-full overflow-visible"  style={{ boxSizing: 'border-box' }}>
                {/* Left Column: Melhores Posts */}
                <div className="hidden lg:block space-y-4 w-full min-w-0">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4 w-full overflow-hidden">
                        <h3 className="font-bold text-[var(--theme-text-light)] mb-3 border-b border-[var(--theme-border-primary)] pb-2 flex items-center">
                            <span className="mr-2">⚡</span> {t('bestPosts') || "Melhores Posts"}
                        </h3>
                        <div className="space-y-3">
                            {bestPosts.length > 0 ? (
                                bestPosts.slice(0, 8).map(post => {
                                    const totalReactions = Object.values(post.reactions || {}).reduce((sum, count) => sum + (count || 0), 0);
                                    const totalEngagement = (post.likes || 0) + totalReactions + (post.reposts || 0);
                                    return (
                                        <div key={post.id} className="text-sm cursor-pointer hover:bg-[var(--theme-bg-tertiary)] py-3 px-2 transition-colors border-b border-[var(--theme-border-primary)] w-full overflow-hidden last:border-b-0" onClick={() => handleNavigateToPost(post.id)}>
                                            <p className="line-clamp-2 text-[var(--theme-text-primary)] text-xs mb-1 font-mono overflow-wrap break-word">{post.content}</p>
                                            <div className="flex items-center text-xs text-[var(--theme-text-secondary)] overflow-hidden overflow-wrap break-word">
                                                <span className="mr-2">❤️ {totalEngagement}</span>
                                                <span className="text-[var(--theme-primary)] font-bold truncate">@{post.author.username}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-[var(--theme-text-secondary)]">
                                    {t('noPostsYet') || 'Nenhum post registrado'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Feed Atual */}
                <div className="space-y-4 w-full min-w-0 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--theme-border-primary)] mb-4 bg-[var(--theme-bg-secondary)] rounded-t-lg overflow-x-auto w-full whitespace-nowrap"  style={{ boxSizing: 'border-box' }}>
                        <button 
                            className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === 'posts' ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                            onClick={() => handleTabChange('posts')}
                        >
                            {t('tabPosts') || "Posts"}
                        </button>
                        <button 
                            className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === 'media' ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                            onClick={() => handleTabChange('media')}
                        >
                            {t('tabMedia') || "Mídias"}
                        </button>
                        {profileUser.profileType === 'professional' && (
                            <button 
                                className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === 'professional' ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                                onClick={() => handleTabChange('professional')}
                            >
                                {t('tabProfessional') || "Profissional"}
                            </button>
                        )}
                        <button 
                            className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === 'temporal' ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                            onClick={() => handleTabChange('temporal')}
                        >
                            {t('tabTemporal') || "Busca Temporal"}
                        </button>
                    </div>

                    {activeTab === 'temporal' && (
                        <div className="bg-[var(--theme-bg-tertiary)] p-2 mb-4 rounded text-center text-sm text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]">
                            {t('showingPostsForDate') || "Exibindo posts de"}: <span className="font-bold text-[var(--theme-text-light)]">{selectedDate.toLocaleDateString()}</span>
                        </div>
                    )}

                    {activeTab === 'professional' ? (
                        <div className="space-y-6">
                            {/* Work Experience */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-6">
                                <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 flex items-center">
                                    <span className="mr-2">💼</span> {t('workExperience') || 'Experiência Profissional'}
                                </h3>
                                {profileUser.workExperience && profileUser.workExperience.length > 0 ? (
                                    <div className="space-y-6">
                                        {profileUser.workExperience.map((exp, i) => (
                                            <div key={i} className="border-l-2 border-[var(--theme-primary)] pl-4">
                                                <h4 className="font-bold text-[var(--theme-text-light)]">{exp.role}</h4>
                                                <p className="text-[var(--theme-primary)]">{exp.company}</p>
                                                <p className="text-xs text-[var(--theme-text-secondary)] mb-2">{exp.duration}</p>
                                                <p className="text-sm text-[var(--theme-text-primary)]">{exp.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[var(--theme-text-secondary)] italic">{t('noWorkExperience') || 'Nenhuma experiência registrada.'}</p>
                                )}
                            </div>

                            {/* Education */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-6">
                                <h3 className="text-xl font-bold text-[var(--theme-text-light)] mb-4 flex items-center">
                                    <span className="mr-2">🎓</span> {t('education') || 'Educação'}
                                </h3>
                                {profileUser.education && profileUser.education.length > 0 ? (
                                    <div className="space-y-4">
                                        {profileUser.education.map((edu, i) => (
                                            <div key={i} className="border-l-2 border-[var(--theme-secondary)] pl-4">
                                                <h4 className="font-bold text-[var(--theme-text-light)]">{edu.school}</h4>
                                                <p className="text-[var(--theme-text-primary)]">{edu.degree}</p>
                                                <p className="text-xs text-[var(--theme-text-secondary)]">{edu.year}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[var(--theme-text-secondary)] italic">{t('noEducation') || 'Nenhuma formação registrada.'}</p>
                                )}
                            </div>
                        </div>
                    ) : canViewPosts ? (
                        filteredPosts.length > 0 ? (
                            <div className="w-full overflow-hidden">
                                {filteredPosts.slice(0, visiblePostsCount).map(post => <PostCard 
                                key={post.id} 
                                post={post} 
                                currentUser={currentUser}
                                onViewProfile={(username) => onNavigate(Page.Profile, username)} 
                                onUpdateReaction={onUpdateReaction}
                                onReply={onReply}
                                onEcho={onEcho}
                                onDelete={onDeletePost}
                                onEdit={setPostToEdit}
                                onTagClick={handleTagClick}
                                onPollVote={onPollVote}
                                typingParentIds={typingParentIds}
                                />)}
                                
                                {filteredPosts.length > visiblePostsCount && (
                                    <div className="flex justify-center pt-4 pb-2">
                                        <button 
                                            onClick={() => setVisiblePostsCount(prev => prev + 10)}
                                            className="px-6 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white transition-colors font-mono tracking-wider rounded-sm"
                                        >
                                            [ {t('loadMore')} ]
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-[var(--theme-text-secondary)] p-10 border border-dashed border-[var(--theme-border-primary)]">
                                <p className="text-lg">{activeTab === 'temporal' ? t('noEchoesFoundDate') : t('noPostsYet')}</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center text-[var(--theme-text-secondary)] p-10 border border-dashed border-[var(--theme-border-primary)]">
                            <p className="text-lg">{t('profileIsPrivate')}</p>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* FIX: Pass allPosts to Timeline component */}
      <div className="flex-shrink-0 w-full overflow-x-hidden">
        <Timeline selectedDate={selectedDate} setSelectedDate={setSelectedDate} onNavigate={onNavigate} allPosts={allPosts} />
      </div>
      
      {/* Modal de Detalhes do Post (Legacy: Se ainda usado via state interno) */}
      {/* Agora preferimos usar a rota /post/:id */}
      {postToEdit && (
        <PostComposer 
            currentUser={currentUser}
            onClose={() => setPostToEdit(null)}
            onSubmit={handlePostSubmit}
            postToEdit={postToEdit}
        />
      )}

      {userListModal && (
          <UserListModal
            title={userListModal.title}
            users={getFullUsersFromList(userListModal.users)}
            currentUser={currentUser}
            currentUserFollowing={userListModal.currentUserFollowing}
            onFollowToggle={(username) => {
              // Optimistically update the local following state so the button flips instantly
              setUserListModal(prev => {
                if (!prev) return prev;
                const alreadyFollowing = prev.currentUserFollowing.includes(username);
                return {
                  ...prev,
                  currentUserFollowing: alreadyFollowing
                    ? prev.currentUserFollowing.filter(u => u !== username)
                    : [...prev.currentUserFollowing, username],
                };
              });
              onFollowToggle(username);
            }}
            onClose={() => setUserListModal(null)}
            onViewProfile={(username) => {
              setUserListModal(null);
              onNavigate(Page.Profile, username);
            }}
          />
      )}
      
      {isEditProfileOpen && (
        <React.Suspense fallback={<LoadingSpinner />}>
            <EditProfileModal 
                user={currentUser} 
                onClose={() => setIsEditProfileOpen(false)} 
                onSave={async (updatedUser) => {
                    if (onUpdateUser) {
                        const result = await onUpdateUser(updatedUser);
                        if (!result.success) {
                            throw new Error(result.error || 'Failed to update profile');
                        }
                    }
                }} 
            />
        </React.Suspense>
      )}

      {/* Report User Modal */}
      {showReportUserModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReportUserModal(false)}>
          <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg w-full max-w-md p-6 space-y-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-mono text-[var(--theme-primary)]">🚩 Denunciar @{profileUser?.username}</h3>
            <p className="text-sm text-[var(--theme-text-secondary)]">Selecione o motivo da denúncia:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[
                { value: 'spam', label: 'Spam' },
                { value: 'harassment', label: 'Assédio ou bullying' },
                { value: 'hate_speech', label: 'Discurso de ódio' },
                { value: 'violence', label: 'Violência ou ameaças' },
                { value: 'nudity', label: 'Nudez ou conteúdo sexual' },
                { value: 'misinformation', label: 'Desinformação' },
                { value: 'impersonation', label: 'Falsidade ideológica' },
                { value: 'other', label: 'Outro' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--theme-bg-tertiary)] cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="reportUserReason"
                    value={opt.value}
                    checked={reportReason === opt.value}
                    onChange={() => setReportReason(opt.value)}
                    className="accent-[var(--theme-primary)]"
                  />
                  <span className="text-[var(--theme-text-primary)]">{opt.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Detalhes adicionais (opcional)..."
              className="w-full p-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded text-sm text-[var(--theme-text-primary)] resize-none h-20 focus:outline-none focus:border-[var(--theme-primary)]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowReportUserModal(false); setReportReason(''); setReportDescription(''); }}
                className="px-4 py-2 text-sm border border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] rounded hover:bg-[var(--theme-bg-tertiary)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportUser}
                disabled={!reportReason}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Denúncia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
