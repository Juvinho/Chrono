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
    profileType: apiUser.profileType || apiUser.profile_type || 'personal',
    headline: apiUser.headline || '',
    skills: apiUser.skills || [],
    workExperience: apiUser.workExperience || apiUser.work_experience || [],
    education: apiUser.education || [],
    connections: apiUser.connections || apiUser.connections_count || 0,
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
    lastSeen: apiUser.lastSeen || apiUser.last_seen || null,
    subscriptionTier: apiUser.subscriptionTier || apiUser.subscription_tier || 'free',
    updatedAt: apiUser.updatedAt || apiUser.updated_at,
  };
}

export function mapApiPostToPost(apiPost: any): any {
  const pollOptions = apiPost.pollOptions || apiPost.poll_options;
  let pollEndsAt = apiPost.pollEndsAt || apiPost.poll_ends_at;
  const voters = apiPost.voters || {};
  
  // Ensure pollEndsAt has a default value if polls exist but no end date
  if (pollOptions && Array.isArray(pollOptions) && !pollEndsAt) {
    // Default to 24 hours from now if not specified
    const defaultEndDate = new Date();
    defaultEndDate.setHours(defaultEndDate.getHours() + 24);
    pollEndsAt = defaultEndDate;
  }
  
  // Calculate total votes and current user's vote
  let totalVotes = 0;
  let userVotedOption: number | null = null;
  
  if (pollOptions && Array.isArray(pollOptions)) {
    totalVotes = pollOptions.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0);
  }
  
  // Find current user's vote (will be set later when we have currentUser context)
  // For now, store voters map for PostCard to use
  
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
    poll: pollOptions ? {
      options: pollOptions,
      totalVotes: totalVotes,
      endsAt: pollEndsAt ? new Date(pollEndsAt) : undefined,
      voters: voters,
    } : undefined,
    // Keep these for backward compatibility
    pollOptions: pollOptions,
    pollEndsAt: pollEndsAt ? new Date(pollEndsAt) : undefined,
    voters: voters,
  };
}

// stories removed
