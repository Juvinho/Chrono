import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Page, Post, CyberpunkReaction, Notification, Conversation } from '../types';
import PostCard from './PostCard';
import Header from './Header';
import Timeline from './Timeline';
import { PostComposer } from './PostComposer';
import { isSameDay } from '../utils/date';
import { useTranslation } from '../hooks/useTranslation';
import UserListModal from './modals/UserListModal';
import { VerifiedIcon, MessageIcon } from './icons';
import FramePreview, { getFrameShape } from './FramePreview';

interface ProfilePageProps {
  currentUser: User;
  profileUsername: string;
  onLogout: () => void;
  onNavigate: (page: Page, username?: string) => void;
  onNotificationClick: (notification: Notification) => void;
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
}

const ProfilePage: React.FC<ProfilePageProps> = ({ 
  currentUser, profileUsername, onLogout, onNavigate, onNotificationClick, users, onFollowToggle, 
  allPosts, allUsers, onUpdateReaction, onReply, onEcho, onDeletePost, onEditPost,
  onPollVote, selectedDate, setSelectedDate, typingParentIds, conversations, onOpenMarketplace
}) => {
  const { t } = useTranslation();
  
  // Prioritize currentUser if it matches the profileUsername to ensure we show the latest state (e.g. after profile updates)
  const isOwnProfile = currentUser.username.toLowerCase() === profileUsername.toLowerCase();
  
  const profileUser = isOwnProfile ? currentUser : (allUsers.find(u => u.username.toLowerCase() === profileUsername.toLowerCase()) || users.find(u => u.username.toLowerCase() === profileUsername.toLowerCase()) || currentUser)!;
  
  const [userListModal, setUserListModal] = useState<{title: string, users: User[]} | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'temporal'>('posts');
  
  const followButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
      if (typeof window === 'undefined') return;
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
          }
          setActiveTab('posts');
      }
  }, [profileUser.username]);

  const handleTabChange = (tab: 'posts' | 'media' | 'temporal') => {
      setActiveTab(tab);

      if (typeof window === 'undefined' || !window.history || !window.location) return;

      const basePath = `/@${encodeURIComponent(profileUser.username)}`;
      let path = basePath;

      if (tab === 'media') {
          path = `${basePath}/media`;
      } else if (tab === 'temporal') {
          path = `${basePath}/temporal`;
      }

      const currentFullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextFullPath = `${path}${window.location.search}${window.location.hash}`;

      if (currentFullPath !== nextFullPath) {
          window.history.pushState({ page: 'profile', tab, username: profileUser.username }, '', nextFullPath);
      }
  };

  const filteredPosts = useMemo(() => {
      let posts = allPosts.filter(p => p.author.username === profileUser.username);
      
      if (activeTab === 'temporal') {
          posts = posts.filter(p => isSameDay(p.timestamp, selectedDate));
      } else if (activeTab === 'media') {
          posts = posts.filter(p => p.imageUrl || p.videoUrl);
      }
      
      return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allPosts, profileUser.username, selectedDate, activeTab]);

  const popularCords = useMemo(() => {
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

    // Also consider posts the user replied to (if we had that link easily, but userPosts covers authored posts)
    // The requirement is "posts that the user commented on that have $"
    // "commented on" could mean authored OR replied.
    // Let's iterate all posts, check replies for user, and if found, check post content for tags.
    
    allPosts.forEach(post => {
        const userReplied = post.replies?.some(r => r.author.username === profileUser.username);
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
        // Mocking a Post object for now to fit the existing rendering or we change rendering
  }, [allPosts, profileUser.username]);

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };
  
   const handleTagClick = (tag: string) => {
    sessionStorage.setItem('chrono_search_query', tag);
    onNavigate(Page.Dashboard);
  };
  
  const handleFollowClick = () => {
      onFollowToggle(profileUser.username);
      if (followButtonRef.current) {
          followButtonRef.current.classList.add('pulse-click');
          setTimeout(() => followButtonRef.current?.classList.remove('pulse-click'), 400);
      }
  }

    const handlePostSubmit = (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>, existingPostId?: string) => {
        if (existingPostId) {
            onEditPost(existingPostId, postData);
        }
        setPostToEdit(null);
    };

  const isFollowing = currentUser.followingList?.includes(profileUser.username);
  const canViewPosts = !profileUser.isPrivate || isFollowing || isOwnProfile;
  
  const getFullUsersFromList = (usersOrUsernames: (string | User)[] = []) => {
      // If the list contains User objects, return them directly.
      // If it contains strings, map them to User objects.
      // This handles the transition where we might have strings or full objects.
      if (usersOrUsernames.length === 0) return [];
      
      if (typeof usersOrUsernames[0] === 'string') {
          return (usersOrUsernames as string[]).map(username => allUsers.find(u => u.username === username)).filter(Boolean) as User[];
      }
      return usersOrUsernames as User[];
  }

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
  
  const avatarShape = profileUser.equippedFrame ? getFrameShape(profileUser.equippedFrame.name) : getRadiusClass('avatar');

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header 
          user={currentUser} 
          onLogout={onLogout} 
          onViewProfile={(username) => onNavigate(Page.Profile, username)} 
          onNavigate={onNavigate}
          onNotificationClick={onNotificationClick}
          onSearch={handleSearch} 
          allPosts={allPosts} 
          allUsers={allUsers}
          conversations={conversations}
          onOpenMarketplace={onOpenMarketplace}
      />
      <main className="flex-grow overflow-y-auto">
        <div className={`max-w-4xl mx-auto ${borderRadius === 'none' ? '' : 'my-4'} animate-fade-in`}>
          <div className={`relative ${getRadiusClass('container')} shadow-lg`}>
            <div className={`relative h-48 md:h-64 w-full overflow-hidden ${getRadiusClass('container')}`}>
                <img 
                  key={profileUser.coverImage || profileUser.profileSettings?.coverImage || 'default-cover'}
                  src={profileUser.coverImage || profileUser.profileSettings?.coverImage || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80'} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#8A2BE2;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#9400FF;stop-opacity:1" />
                          </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grad)"/>
                      </svg>
                    `)}`;
                  }}
                />
            </div>
            <div className="absolute -bottom-16 left-4 md:left-8 flex items-end z-10">
                <div className="relative w-24 h-24">
                    <div className={`w-full h-full ${avatarShape} border-4 border-[var(--theme-bg-primary)] overflow-hidden bg-[var(--theme-bg-primary)] relative z-10`}>
                        <img src={profileUser.avatar} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                        
                         {/* Effect Overlay */}
                        {profileUser.equippedEffect && (
                             <div className="absolute inset-0 pointer-events-none z-20 mix-blend-screen opacity-60">
                                 <img 
                                    src={profileUser.equippedEffect.imageUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover animate-pulse-soft"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                 />
                             </div>
                        )}
                    </div>

                    {/* Frame Overlay */}
                    {profileUser.equippedFrame && (
                         <div className="absolute -inset-1 z-20 pointer-events-none">
                             <FramePreview item={profileUser.equippedFrame} />
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
                        <VerifiedIcon 
                            className="w-6 h-6 animate-pulse-soft"
                            style={{ color: profileUser.verificationBadge.color }}
                            title={profileUser.verificationBadge.label}
                        />
                    )}
                    {profileUser.pronouns && (
                        <span className="text-sm text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded-full">{profileUser.pronouns}</span>
                    )}
                </div>
                {profileUser.bio && (
                  <p className="text-[var(--theme-text-primary)] mt-2">{profileUser.bio}</p>
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
                  {!isOwnProfile && (
                    <>
                      <button onClick={() => onNavigate(Page.Messages, profileUser.username)} className="follow-btn px-2 py-1 rounded-sm transition-colors" title={t('messageButton')}>
                          <MessageIcon className="w-5 h-5"/>
                      </button>
                      <button ref={followButtonRef} onClick={handleFollowClick} className={`${isFollowing ? 'following-btn' : 'follow-btn'} px-4 py-1 rounded-sm transition-colors`}>
                        {isFollowing ? t('profileFollowing') : t('profileFollow')}
                      </button>
                    </>
                  )}
              </div>
            </div>
            <div className="flex space-x-6 mt-4 text-[var(--theme-text-secondary)]">
              <button onClick={() => setUserListModal({title: t('profileFollowers'), users: getFullUsersFromList(profileUser.followersList || [])})}>
                  <span className="font-bold text-[var(--theme-text-light)]">{profileUser.followers}</span> {t('profileFollowers')}
                </button>
                <button onClick={() => setUserListModal({title: t('profileFollowing'), users: getFullUsersFromList(profileUser.followingList || [])})}>
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

                    {canViewPosts ? (
                        filteredPosts.length > 0 ? (
                            filteredPosts.map(post => <PostCard 
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
                            />)
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

                {/* Right Column: AI Summary */}
                <div className="hidden lg:block space-y-4">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg p-4">
                        <h3 className="font-bold text-[var(--theme-text-light)] mb-3 border-b border-[var(--theme-border-primary)] pb-2 flex items-center">
                            <span className="mr-2">🤖</span> {t('aiBio') || "Resumo AI"}
                        </h3>
                        <div className="text-sm text-[var(--theme-text-primary)] space-y-2">
                            <p className="italic opacity-80">
                                "{profileUser.bio ? 
                                    `Uma entidade digital identificada como @${profileUser.username}. ${profileUser.bio.length > 50 ? 'Possui uma presença complexa e multifacetada.' : 'Define-se de forma concisa.'}` 
                                    : 'Uma entidade enigmática sem descrição definida.'} 
                                {popularCords.length > 0 ? ' Frequentemente inicia discussões engajadas.' : ' Mantém um perfil de baixo ruído na rede.'}"
                            </p>
                            <div className="mt-4 pt-2 border-t border-[var(--theme-border-primary)]">
                                <span className="text-xs text-[var(--theme-text-secondary)] font-mono uppercase">
                                    :: Persona Analysis ::
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
    </div>
  );
};

export default ProfilePage;
