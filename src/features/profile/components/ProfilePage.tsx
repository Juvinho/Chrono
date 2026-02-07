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
import { useFloatingChat } from '../../../contexts/FloatingChatContext';
import UserListModal from '../../../components/ui/UserListModal';
import { VerifiedIcon, MessageIcon, PaperPlaneIcon } from '../../../components/ui/icons';
import FramePreview, { getFrameShape } from './FramePreview';
import Avatar from './Avatar';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { apiClient } from '../../../api';
import { TagBadgeGroup } from '../../../components/ui/TagBadge';
import { useUserTags } from '../../../hooks/useTags';

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
  const navigate = useNavigate();
  const { openChat } = useFloatingChat();
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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userListModal, setUserListModal] = useState<{title: string, users: User[]} | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'temporal' | 'professional'>('posts');

  const handleTabChange = (tab: 'posts' | 'media' | 'temporal' | 'professional') => {
    setActiveTab(tab);
  };
  const [visiblePostsCount, setVisiblePostsCount] = useState(10);
  
  const followButtonRef = useRef<HTMLButtonElement>(null);
  
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
    // Reset fetched user when profile username changes
    if (fetchedUser && fetchedUser.username.toLowerCase() !== profileUsername.toLowerCase()) {
        setFetchedUser(null);
        setFetchError(null);
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
      let posts = allPosts.filter(p => p.author.username === profileUser.username);
      
      if (activeTab === 'temporal') {
          posts = posts.filter(p => isSameDay(new Date(p.timestamp), selectedDate));
      } else if (activeTab === 'media') {
          posts = posts.filter(p => p.imageUrl || p.videoUrl);
      }
      
      return posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allPosts, profileUser?.username, selectedDate, activeTab]);

  const popularCords = useMemo(() => {
    if (!profileUser) return [];
    // Collect all posts where the user is the author or has replied
    const userPosts = allPosts.filter(p => p.author.username === profileUser.username);
    
    // Extract unique tags starting with $ from these posts
    const tagCounts: Record<string, number> = {};
    
    userPosts.forEach(post => {
        const matches = post.content.match(/\$[a-zA-Z0-9_]+/g);
        if (matches) {
            matches.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    allPosts.forEach(post => {
        const userReplied = post.replies?.some(reply => reply.author.username === profileUser.username);
        if (userReplied) {
             const matches = post.content.match(/\$[a-zA-Z0-9_]+/g);
             if (matches) {
                matches.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
             }
        }
    });

    return Object.entries(tagCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5)
        .map(([tag]) => ({ id: tag, content: tag, replies: [], reactions: {}, timestamp: new Date(), author: { username: '', avatar: '' } as User })); 
  }, [allPosts, profileUser?.username]);

  if (!profileUser) {
      if (isLoadingUser) {
          return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)]">
                  <LoadingSpinner />
                  <p className="mt-4 text-[var(--theme-primary)] font-mono animate-pulse">{t('loadingProfile') || 'LOCATING TARGET...'}</p>
              </div>
          );
      }
      if (fetchError) {
           return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
                  <div className="text-red-500 text-6xl mb-4">404</div>
                  <p className="text-xl font-mono">{fetchError}</p>
                  <button onClick={() => onNavigate(Page.Dashboard)} className="mt-8 px-6 py-2 bg-[var(--theme-primary)] text-white rounded-sm hover:brightness-110">
                      {t('returnHome') || 'RETURN TO BASE'}
                  </button>
              </div>
          );
      }
      // Fallback loading
      return <LoadingSpinner />;
  }
  
  const isFollowing = currentUser.followingList?.includes(profileUser.username) || false;

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };
  
   const handleTagClick = (tag: string) => {
    sessionStorage.setItem('chrono_search_query', tag);
    onNavigate(Page.Dashboard);
  };
  
  const handleFollowClick = () => {
      if (!isFollowing) {
          playSound('follow');
      }

      // Optimistic update for fetchedUser (if viewing another user)
      if (fetchedUser && fetchedUser.username === profileUser.username) {
           const isNowFollowing = !isFollowing;
           const newFollowerCount = isNowFollowing 
               ? (fetchedUser.followers || 0) + 1 
               : Math.max(0, (fetchedUser.followers || 0) - 1);
           
           const newFollowersList = isNowFollowing
               ? [...(fetchedUser.followersList || []), currentUser.username]
               : (fetchedUser.followersList || []).filter(u => u !== currentUser.username);

           setFetchedUser({
               ...fetchedUser,
               followers: newFollowerCount,
               followersList: newFollowersList
           });
      }

      onFollowToggle(profileUser.username);
      if (followButtonRef.current) {
          followButtonRef.current.classList.add('pulse-click');
          setTimeout(() => followButtonRef.current?.classList.remove('pulse-click'), 400);
      }
  };

  const handleSendMessage = () => {
    if (profileUser) {
      console.log('📨 Navigating to messages with targetUserId:', profileUser.id);
      navigate('/messages', {
        state: {
          targetUserId: profileUser.id,
          targetUsername: profileUser.username
        }
      });
    }
  };

    const handlePostSubmit = (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>, existingPostId?: string) => {
        if (existingPostId) {
            onEditPost(existingPostId, postData);
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

    console.log(`[ProfilePage] Request to open ${type}. Count: ${count}. Raw list:`, rawList);

    // 1. If we have a list of objects, use it directly
    if (Array.isArray(rawList) && rawList.length > 0 && typeof rawList[0] !== 'string') {
        console.log('[ProfilePage] Using existing full user objects');
        setUserListModal({ title, users: rawList as User[] });
        return;
    }

    // 2. If the count is 0, show empty list immediately
    if (count === 0) {
        setUserListModal({ title, users: [] });
        return;
    }

    // 3. If we have strings (usernames) and they exist in allUsers, we can try to reconstruct
    // But for reliability (and to fix the bug), let's fetch the fresh list from API
    try {
        console.log(`[ProfilePage] Fetching fresh details for ${profileUser.username} to populate list...`);
        // Show a loading indicator if needed, or just wait
        const response = await apiClient.getUser(profileUser.username);
        
        if (response.data) {
            const freshList = type === 'followers' ? response.data.followersList : response.data.followingList;
            console.log(`[ProfilePage] API returned ${freshList?.length} items for ${type}`);
            
            // Map the API response (which might be raw) to User objects if needed, 
            // but usually apiClient response is already mapped? 
            // The apiClient returns mapped data from `mappers.ts`.
            
            setUserListModal({ title, users: freshList || [] });
        } else {
            console.warn('[ProfilePage] API returned no data');
            setUserListModal({ title, users: [] });
        }
    } catch (e) {
        console.error('[ProfilePage] Error fetching user list:', e);
        // Fallback: try to show what we have (strings) mapped from allUsers
        const fallback = getFullUsersFromList(rawList || []);
        setUserListModal({ title, users: fallback });
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
                    <h2 className="text-2xl font-bold text-red-500 glitch-effect" data-text="USER NOT FOUND">USER NOT FOUND</h2>
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
      <main className="flex-grow overflow-y-auto">
        <div className={`max-w-4xl mx-auto ${borderRadius === 'none' ? '' : 'my-4'} animate-fade-in`}>
          <div className={`relative ${getRadiusClass('container')} shadow-lg`}>
            <div className={`relative h-48 md:h-64 w-full overflow-hidden ${getRadiusClass('container')}`}>
                <Avatar 
                  src={profileUser.coverImage || profileUser.profileSettings?.coverImage || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80'} 
                  username={profileUser.username}
                  className="w-full h-full object-cover"
                />
            </div>
            <div className="absolute -bottom-16 left-4 md:left-8 flex items-end z-10">
                <div className="relative w-24 h-24">
                    <img 
                        src={profileUser.avatar || 'https://via.placeholder.com/150'}
                        alt={profileUser.username}
                        className={`w-full h-full ${avatarShape} object-cover`}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/150'; }}
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
                            />
                        </div>
                    )}
                </div>
            </div>
          </div>
          <div className={`pt-20 px-8 pb-8 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] mt-[-1px] ${getRadiusClass('container')} relative z-0`}>
            <div className="flex justify-between items-start">
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
              <div className="flex items-center space-x-2 flex-shrink-0">
                  <button onClick={() => onNavigate(Page.Dashboard)} className="back-to-echo-btn">
                      &lt; {t('backToEchoFrame')}
                  </button>
                  {isOwnProfile ? (
                      <button 
                          onClick={() => setIsEditProfileOpen(true)}
                          className="px-4 py-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] text-[var(--theme-text-primary)] rounded-sm transition-colors flex items-center"
                      >
                          <span className="mr-2">✎</span> {t('editProfile') || 'Edit Profile'}
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
                      <button ref={followButtonRef} onClick={handleFollowClick} className={`${isFollowing ? 'following-btn' : 'follow-btn'} px-4 py-1 rounded-sm transition-colors`}>
                        {isFollowing ? t('profileFollowing') : t('profileFollow')}
                      </button>
                    </>
                  )}
              </div>
            </div>
            <div className="flex space-x-6 mt-4 text-[var(--theme-text-secondary)]">
              <button onClick={() => handleOpenUserList('followers')}>
                  <span className="font-bold text-[var(--theme-text-light)]">{profileUser.followers}</span> {t('profileFollowers')}
                </button>
                <button onClick={() => handleOpenUserList('following')}>
                  <span className="font-bold text-[var(--theme-text-light)]">{profileUser.following}</span> {t('profileFollowing')}
                </button>
            </div>
          </div>
          
          <div className="mt-4 px-4 pb-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Engagement */}
                <div className="hidden lg:block space-y-4">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
                        <h3 className="font-bold text-[var(--theme-text-light)] mb-3 border-b border-[var(--theme-border-primary)] pb-2">
                            {t('popularCords') || "Cordões Mais Comentados"}
                        </h3>
                        <div className="space-y-3">
                            {popularCords.length > 0 ? (
                                popularCords.map(tagPost => (
                                    <div key={tagPost.id} className="text-sm cursor-pointer hover:bg-[var(--theme-bg-tertiary)] p-2 rounded transition-colors" onClick={() => {
                                        sessionStorage.setItem('chrono_search_query', tagPost.content);
                                        onNavigate(Page.Dashboard);
                                    }}>
                                        <p className="line-clamp-2 text-[var(--theme-text-primary)] font-mono">{tagPost.content}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[var(--theme-text-secondary)]">{t('noPostsYet')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column: Feed */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--theme-border-primary)] mb-4 bg-[var(--theme-bg-secondary)] rounded-t-lg overflow-hidden">
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
                            <>
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
                                            [ {t('loadMore') || 'LOAD MORE DATA'} ]
                                        </button>
                                    </div>
                                )}
                            </>
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

                {/* Right Column: Bio */}
                <div className="hidden lg:block space-y-4">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
                        <h3 className="font-bold text-[var(--theme-text-light)] mb-3 border-b border-[var(--theme-border-primary)] pb-2 flex items-center">
                            <span className="mr-2">📝</span> {t('bio') || "Bio"}
                        </h3>
                        <div className="text-sm text-[var(--theme-text-primary)] space-y-2">
                            {profileUser.bio ? (
                                <p className="whitespace-pre-wrap">{profileUser.bio}</p>
                            ) : (
                                <p className="italic opacity-60 text-[var(--theme-text-secondary)]">
                                    {t('noBio') || "Nenhuma biografia disponível."}
                                </p>
                            )}

                            {profileUser.profileType === 'professional' && profileUser.skills && profileUser.skills.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-[var(--theme-border-primary)]">
                                    <h4 className="text-xs font-mono uppercase text-[var(--theme-text-secondary)] mb-2">:: Skills ::</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profileUser.skills.map(skill => (
                                            <span key={skill} className="bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded border border-[var(--theme-border-secondary)] text-xs hover:border-[var(--theme-primary)] transition-colors">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-4 pt-2 border-t border-[var(--theme-border-primary)]">
                                <span className="text-xs text-[var(--theme-text-secondary)] font-mono uppercase">
                                    :: System Tags ::
                                </span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="bg-[var(--theme-bg-tertiary)] px-2 py-1 rounded text-xs border border-[var(--theme-primary)] text-[var(--theme-primary)]">
                                        {profileUser.isVerified ? 'Verificado' : 'Nômade'}
                                    </span>
                                    <span className="bg-[var(--theme-bg-tertiary)] px-2 py-1 rounded text-xs border border-[var(--theme-secondary)] text-[var(--theme-secondary)]">
                                        {filteredPosts.length > 10 ? 'Prolífico' : 'Observador'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>
      {/* FIX: Pass allPosts to Timeline component */}
      <Timeline selectedDate={selectedDate} setSelectedDate={setSelectedDate} onNavigate={onNavigate} allPosts={allPosts} />
      
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
            onFollowToggle={onFollowToggle}
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
    </div>
  );
}
