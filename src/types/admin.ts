export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
  is_banned: boolean;
  post_count?: number;
  followers_count?: number;
}

export interface UserStats {
  posts: number;
  followers: number;
  following: number;
  conversations: number;
}

export interface AdminOverallStats {
  totalUsers: number;
  bannedUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalConversations: number;
  newUsersThisWeek: number;
}
