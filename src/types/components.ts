/**
 * Component Props Types - A-06: Eliminate media?: any patterns
 * Standardized prop interfaces for components
 */

import { User, Post, Message, Notification } from './api.js';

// Media payload interface
export interface MediaPayload {
  imageUrl?: string;
  videoUrl?: string;
  metadata?: unknown;
}

// Post/Timeline component props
export interface PostListProps {
  posts: Post[];
  onReply: (parentId: string, content: string, isPrivate: boolean, media?: MediaPayload) => void;
}

export interface PostDetailProps {
  postId: string;
  onReply: (parentId: string, content: string, isPrivate: boolean, media?: MediaPayload) => void;
  onEditPost: (postId: string, data: PostEditData) => void;
}

export interface PostEditData {
  content?: string;
  poll?: PollData;
  tags?: string[];
}

export interface PollData {
  options: string[];
  endsAt: string;
}

// Messaging component props
export interface MessageInputProps {
  conversationId: string;
  onSend: (text: string, media?: MediaPayload) => Promise<void>;
}

export interface ConversationProps {
  conversationId: string;
  messages: Message[];
  onSendMessage: (text: string, media?: MediaPayload) => void;
}

// Handler callbacks
export interface NotificationHandler {
  (notification: Notification): void;
}

export interface ReactionUpdate {
  postId: string;
  reaction: ReactionType;
  actor?: User;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

// Timeline handlers
export interface TimelineHandlers {
  handleNotificationClick: NotificationHandler;
  handleUpdateReaction: (postId: string, reaction: ReactionType, actor?: User) => void;
  handleReply: (parentId: string, content: string, isPrivate: boolean, media?: MediaPayload, actor?: User) => void;
  handleNavigate: (page: string, data?: Record<string, any>) => void;
  handleEditPost: (postId: string, data: PostEditData) => void;
}

// Pagination props
export interface PaginationProps<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
}

// Infinite scroll props
export interface InfiniteScrollProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  threshold?: number;
}

// Modal props
export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

// Form props
export interface FormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

// Floating Chat Container props
export interface FloatingChatProps {
  userId?: string;
  onClose?: () => void;
}

// Socket/Real-time event handlers
export interface SocketHandlers {
  onMessageReceived: (message: Message) => void;
  onConversationUpdated: (data: ConversationUpdateData) => void;
  onUserOnline: (userId: string) => void;
  onUserOffline: (userId: string) => void;
  onTyping: (data: TypingIndicator) => void;
}

export interface ConversationUpdateData {
  conversationId: string;
  lastMessage?: Message;
  updatedAt: string;
}

export interface TypingIndicator {
  conversationId: string;
  users: string[];
}

// Search props
export interface SearchProps {
  query: string;
  onSearch: (results: Record<string, any>) => void;
  isLoading?: boolean;
  filters?: SearchFilters;
}

export interface SearchFilters {
  type?: 'posts' | 'users' | 'tags';
  dateRange?: { from: string; to: string };
  limit?: number;
}

// Admin props
export interface AdminActionHandlers {
  onBanUser: (userId: string, reason?: string) => Promise<void>;
  onUnbanUser: (userId: string) => Promise<void>;
  onDeletePost: (postId: string, reason?: string) => Promise<void>;
  onVerifyUser: (userId: string) => Promise<void>;
}

// Theme/UI props
export interface ThemeProps {
  isDark: boolean;
  onThemeChange: (isDark: boolean) => void;
}

// Audio/Sound context
export interface SoundContextValue {
  isSoundEnabled: boolean;
  playSound: (type: SoundType) => void;
  toggleSound: () => void;
}

export type SoundType = 'notification' | 'message' | 'like' | 'error' | 'success';
