

export interface Message {
  id: string;
  senderUsername: string;
  text: string;
  timestamp: Date;
}

export interface Conversation {
  id: string; // comprised of participant usernames
  participants: string[];
  messages: Message[];
  lastMessageTimestamp: Date;
  unreadCount: { [username: string]: number };
}

export type CyberpunkReaction = 'Glitch' | 'Upload' | 'Corrupt' | 'Rewind' | 'Static';

export interface ProfileSettings {
  theme: 'dark' | 'light';
  accentColor: 'purple' | 'green' | 'amber' | 'red' | 'blue';
  effect: 'none' | 'scanline' | 'glitch_overlay';
  coverImage: string;
  animationsEnabled?: boolean;
  borderRadius?: 'none' | 'sm' | 'md' | 'full';
}

export type NotificationType = 'reply' | 'reaction' | 'follow' | 'mention' | 'repost' | 'directMessage';

export interface Notification {
  id: string;
  notificationType: NotificationType;
  actor: User;
  post?: Post;
  read: boolean;
  timestamp: Date;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string; // Image URL, Video URL or Text
  type: 'image' | 'text' | 'video';
  timestamp: Date;
  expiresAt: Date;
  viewers?: string[];
}

export interface User {
  username: string;
  email?: string;
  password?: string;
  avatar: string;
  bio: string;
  birthday: string;
  pronouns?: string;
  location?: string;
  website?: string;
  coverImage: string;
  followers: number;
  following: number;
  profileSettings?: ProfileSettings;
  followingList?: User[];
  followersList?: User[];
  notifications?: Notification[];
  blockedUsers?: string[];
  isPrivate?: boolean;
  isVerified?: boolean;
  verificationBadge?: {
    label: string;
    color: string;
  };
  createdAt?: string | Date;
  stories?: Story[];
  subscriptionTier?: 'free' | 'pro' | 'pro_plus';
  subscriptionExpiresAt?: Date;
  equippedFrame?: Item;
  equippedEffect?: Item;
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
    item?: Item;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp: Date;
  reactions?: { [key in CyberpunkReaction]?: number };
  isThread?: boolean;
  isPrivate?: boolean;
  inReplyTo?: { postId: string, author: User, content: string };
  replies?: Post[];
  repostOf?: Post;
  // New properties for polls
  pollOptions?: { option: string, votes: number }[];
  pollEndsAt?: Date;
  voters?: { [username: string]: number };
}

export enum Page {
  Welcome,
  Login,
  Register,
  Verify,
  Dashboard,
  Profile,
  Settings,
  ForgotPassword,
  ResetPassword,
  Messages,
  VideoAnalysis,
}

// FIX: Add global type definitions for Web Speech API to fix TypeScript errors in PostComposer.tsx
// These are not standard on the window object and need to be declared globally.
declare global {
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onstart: () => void;
    onend: () => void;
    start(): void;
    stop(): void;
  }

  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }

  var SpeechRecognition: { new(): SpeechRecognition };
  var webkitSpeechRecognition: { new(): SpeechRecognition };
}