/**
 * API Response Types - A-06: Eliminate baseClient.request<any>
 * Centralized types for all API endpoints
 */

// Base API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, any>;
}

// Auth Responses
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
}

export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_banned?: boolean;
  created_at: string;
  updated_at: string;
  blockedUsers?: string[];
  following?: string[];
  followers?: string[];
}

// Post Responses
export interface Post {
  id: string;
  content: string;
  author_id: string;
  image_url?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
  in_reply_to_id?: string;
  is_private?: boolean;
  reaction_count?: number;
  reply_count?: number;
  poll?: Poll;
  pollOptions?: PollOption[];
  pollEndsAt?: string;
  tags?: Tag[];
}

export interface Poll {
  id: string;
  options: PollOption[];
  endsAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Tag {
  id: string;
  name: string;
}

// Conversation/Messaging Responses
export interface Conversation {
  id: string;
  participants: User[] | string[];
  last_message?: Message;
  messages?: Message[];
  updated_at: string;
  last_message_at?: string;
  other_username?: string;
  lastMessageTimestamp?: string | number;
  unreadCount?: Record<string, number>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  media?: MessageMedia;
  created_at: string;
  is_read?: boolean;
}

export interface MessageMedia {
  imageUrl?: string;
  videoUrl?: string;
  metadata?: unknown;
}

// Notification Responses
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id?: string;
  resource_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'follow'
  | 'like'
  | 'reply'
  | 'mention'
  | 'message'
  | 'tag'
  | 'verification'
  | 'system';

// Admin Responses
export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  reason?: string;
  status: 'success' | 'failed';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminStats {
  total_actions: number;
  by_type: Record<string, number>;
  success_rate: number;
  by_admin: Record<string, number>;
}

// Search Response
export interface SearchResult {
  posts?: Post[];
  users?: User[];
  tags?: Tag[];
  total: number;
}

// Bookmark Response
export interface BookmarkResponse {
  success: boolean;
  bookmarkedPosts: Post[];
  total: number;
  hasMore: boolean;
}

// Marketplace Response
export interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

// Companion Response
export interface Companion {
  id: string;
  name: string;
  type: string;
  mood?: string;
  status?: string;
}

// List Response Wrapper
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Generic Request/Response for batch operations
export interface BatchResponse<T> {
  success: boolean;
  results: T[];
  errors?: Array<{ id: string; error: string }>;
}
