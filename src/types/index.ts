

export interface Message {
  id: string;
  senderUsername: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  glitchiType?: string; // If sharing a glitchi
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string; // comprised of participant usernames
  participants: string[];
  messages: Message[];
  lastMessageTimestamp: Date;
  unreadCount: { [username: string]: number };
  isEncrypted?: boolean;
  selfDestructTimer?: number; // in seconds, 0 or undefined means no self-destruct
}

export type CyberpunkReaction = 'Glitch' | 'Upload' | 'Corrupt' | 'Rewind' | 'Static';

export interface ProfileSettings {
  theme: 'dark' | 'light';
  accentColor: 'purple' | 'green' | 'amber' | 'red' | 'blue';
  effect: 'none' | 'scanline' | 'glitch_overlay';
  themeSkin?: string;
  coverImage: string;
  animationsEnabled?: boolean;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  autoRefreshEnabled?: boolean;
  autoRefreshInterval?: number;
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


export interface User {
  id: string;
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
  profileType?: 'personal' | 'professional';
  headline?: string; // Professional headline
  skills?: string[];
  workExperience?: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  education?: {
    school: string;
    degree: string;
    year: string;
  }[];
  profileSettings?: ProfileSettings;
  followingList?: string[];
  followersList?: string[];
  notifications?: Notification[];
  blockedUsers?: string[];
  isPrivate?: boolean;
  isVerified?: boolean;
  verificationBadge?: {
    label: string;
    color: string;
  };
  createdAt?: string | Date;
  subscriptionTier?: 'free' | 'pro' | 'pro_plus';
  subscriptionExpiresAt?: Date;
  lastSeen?: Date | string | null;
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
  timestamp: string | Date; // Allow Date for internal usage before sending to API
  likes: number;
  replies?: Post[];
  reposts?: number;
  likedBy: string[]; // usernames
  isThread?: boolean;
  repostOf?: Post;
  inReplyTo?: Post;
  reactions?: { [key in CyberpunkReaction]?: number }; // Count of each reaction type
  userReaction?: CyberpunkReaction; // The current user's reaction
  poll?: {
    options: { option: string; votes: number }[];
    totalVotes: number;
    userVotedOption?: number | null; // Index of option voted by current user
    endsAt?: Date;
  };
  isPrivate?: boolean;
  viewCount?: number;
  unlockAt?: string | Date; // Time Capsule
  mood?: 'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral'; // Neural Mood
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
  ChatTest,
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
