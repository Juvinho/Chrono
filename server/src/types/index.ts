export type CyberpunkReaction = 'Glitch' | 'Upload' | 'Corrupt' | 'Rewind' | 'Static';
export type NotificationType = 'reply' | 'reaction' | 'follow' | 'mention' | 'repost' | 'directMessage';

export interface ProfileSettings {
  theme: 'dark' | 'light';
  accentColor: 'purple' | 'green' | 'amber' | 'red' | 'blue';
  effect: 'none' | 'scanline' | 'glitch_overlay';
  coverImage?: string;
  animationsEnabled?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string;
  birthday: string | null;
  pronouns: string | null;
  location: string | null;
  website: string | null;
  coverImage: string | null;
  followers: number;
  following: number;
  isPrivate: boolean;
  isVerified: boolean;
  verificationBadge?: {
    label: string;
    color: string;
  };
  profileSettings: ProfileSettings;
  blockedUsers: string[];
  subscriptionTier: 'free' | 'pro' | 'pro_plus';
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  equippedFrame?: Item;
  equippedEffect?: Item;
  followersList?: string[];
  followingList?: string[];
}

export interface Item {
  id: string;
  type: 'frame' | 'effect' | 'badge' | 'theme';
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserItem {
    id: string;
    userId: string;
    itemId: string;
    isEquipped: boolean;
    purchasedAt: Date;
    item?: Item; // Joined item data
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isThread: boolean;
  isPrivate: boolean;
  inReplyToId: string | null;
  repostOfId: string | null;
  pollOptions?: { option: string; votes: number }[];
  pollEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  lastMessageTimestamp: Date;
  unreadCount: { [username: string]: number };
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  notificationType: NotificationType;
  postId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  reactionType: CyberpunkReaction;
  createdAt: Date;
}

export interface PollVote {
  id: string;
  postId: string;
  userId: string;
  optionIndex: number;
  createdAt: Date;
}

export interface Story {
  id: string;
  userId: string;
  content: string;
  type: 'image' | 'video' | 'text';
  createdAt: Date;
  expiresAt: Date;
  viewers: string[]; // Array of user IDs
}

