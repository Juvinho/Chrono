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

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface AdminReport {
  id: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  created_at: string;
  reviewed_at?: string | null;
  reporter: {
    id: string;
    username: string;
    display_name: string;
  };
  reported_user: {
    id: string;
    username: string;
    display_name: string;
    is_banned: boolean;
  } | null;
  reported_post: {
    id: string;
    content: string;
    author_id: string;
    author_username: string;
  } | null;
  reviewed_by: {
    id: string;
    username: string;
  } | null;
}

export interface AdminReportStats {
  total: number;
  byStatus: Record<ReportStatus, number>;
  byReason: Record<string, number>;
}
