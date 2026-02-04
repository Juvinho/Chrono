export function mapApiUserToUser(apiUser: any): any {
  if (!apiUser) return null;
  
  return {
    id: apiUser.id || apiUser._id,
    username: apiUser.username,
    email: apiUser.email,
    avatar: apiUser.avatar,
    bio: apiUser.bio,
    birthday: apiUser.birthday,
    location: apiUser.location,
    website: apiUser.website,
    pronouns: apiUser.pronouns,
    coverImage: apiUser.coverImage || apiUser.cover_image,
    followers: apiUser.followers !== undefined ? apiUser.followers : (apiUser.followers_count || 0),
    following: apiUser.following !== undefined ? apiUser.following : (apiUser.following_count || 0),
    followersList: apiUser.followersList || [],
    followingList: apiUser.followingList || [],
    isPrivate: apiUser.isPrivate || apiUser.is_private || false,
    isVerified: apiUser.isVerified || apiUser.is_verified || false,
    verificationBadge: apiUser.verificationBadge || apiUser.verification_badge ? {
        label: (apiUser.verificationBadge?.label || apiUser.verification_badge?.label),
        color: (apiUser.verificationBadge?.color || apiUser.verification_badge?.color)
    } : undefined,
    profileSettings: apiUser.profileSettings || apiUser.profile_settings || {
      theme: 'light',
      accentColor: 'purple',
      effect: 'none',
      animationsEnabled: true,
    },
    equippedFrame: apiUser.equippedFrame,
    equippedEffect: apiUser.equippedEffect,
    blockedUsers: apiUser.blockedUsers || apiUser.blocked_users || [],
    notifications: apiUser.notifications || [],
    createdAt: apiUser.createdAt || apiUser.created_at,
    stories: apiUser.stories ? apiUser.stories.map(mapApiStoryToStory) : [],
  };
}

export function mapApiPostToPost(apiPost: any): any {
  return {
    id: apiPost.id,
    author: apiPost.author ? mapApiUserToUser(apiPost.author) : {
      username: apiPost.authorId,
      avatar: '',
      bio: '',
    },
    content: apiPost.content,
    imageUrl: apiPost.imageUrl || apiPost.image_url,
    videoUrl: apiPost.videoUrl || apiPost.video_url,
    timestamp: new Date(apiPost.createdAt || apiPost.created_at),
    reactions: apiPost.reactions || {},
    isThread: apiPost.isThread || apiPost.is_thread || false,
    isPrivate: apiPost.isPrivate || apiPost.is_private || false,
    inReplyTo: apiPost.inReplyTo,
    replies: (apiPost.replies || []).map(mapApiPostToPost),
    repostOf: apiPost.repostOf ? mapApiPostToPost(apiPost.repostOf) : undefined,
    pollOptions: apiPost.pollOptions || apiPost.poll_options,
    pollEndsAt: apiPost.pollEndsAt || apiPost.poll_ends_at ? new Date(apiPost.pollEndsAt || apiPost.poll_ends_at) : undefined,
    voters: apiPost.voters || {},
  };
}

export function mapApiStoryToStory(apiStory: any): any {
  return {
    id: apiStory.id,
    userId: apiStory.userId || apiStory.user_id,
    username: apiStory.username || apiStory.author?.username,
    userAvatar: apiStory.userAvatar || apiStory.author?.avatar || '',
    content: apiStory.content,
    type: apiStory.type,
    timestamp: new Date(apiStory.createdAt || apiStory.created_at),
    expiresAt: new Date(apiStory.expiresAt || apiStory.expires_at),
    viewers: apiStory.viewers || [],
    author: apiStory.author ? mapApiUserToUser(apiStory.author) : undefined,
  };
}
