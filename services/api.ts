// API Client for Chrono Backend

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocal) {
      // Force local backend when running locally, regardless of env vars
      // to prevent accidental connection to production
      return 'http://127.0.0.1:3001/api';
    }
    
    // Production: Always use relative path.
    return '/api';
  }
  
  // Fallback for non-browser environments
  return 'http://127.0.0.1:3001/api';
};

const API_BASE_URL = getBaseUrl();

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('chrono_token', token);
    } else {
      localStorage.removeItem('chrono_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('chrono_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || data.details || `Request failed with status ${response.status}`;
        if (data.details) console.error('API Error Details:', data.details);
        return { error: errorMessage };
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return { data };
    } catch (error: any) {
      console.error('API request failed:', error);
      console.error('Request URL:', `${API_BASE_URL}${endpoint}`);
      
      if (error.name === 'AbortError') {
         return { error: 'Tempo limite de conexão excedido. O servidor pode estar indisponível.' };
      }
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        return { error: `Não foi possível conectar ao servidor. Verifique se o backend está rodando.` };
      }
      return { error: error.message || 'Erro de rede' };
    }
  }

  // Auth endpoints
  async login(credentials: any) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: any) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    this.setToken(null);
    return { data: { success: true } };
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async getCurrentUser() {
    return this.getMe();
  }

  async updateProfile(data: any) {
    return this.request<any>('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateUser(username: string, data: any) {
    return this.request<any>(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async checkUsername(username: string) {
    return this.request<any>('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  // User endpoints
  async getUser(username: string) {
    return this.request<any>(`/users/${username}`);
  }

  async searchUsers(query: string) {
    const q = query.trim();
    // If query is empty, use a special path or handle it
    const endpoint = q ? `/users/search/${encodeURIComponent(q)}` : '/users/search/recommended';
    return this.request<any[]>(endpoint);
  }

  async followUser(userId: string) {
    return this.request<any>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string) {
    return this.request<any>(`/users/${userId}/unfollow`, {
      method: 'POST',
    });
  }

  // Post endpoints
  async getPosts(options: any = {}) {
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit.toString());
    if (options.offset) queryParams.append('offset', options.offset.toString());
    if (options.author) queryParams.append('author', options.author);
    if (options.inReplyTo) queryParams.append('inReplyTo', options.inReplyTo);

    return this.request<any[]>(`/posts?${queryParams.toString()}`);
  }

  async getPost(id: string) {
    return this.request<any>(`/posts/${id}`);
  }

  async createPost(postData: any) {
    return this.request<any>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async deletePost(postId: string) {
    return this.request<any>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async likePost(postId: string) {
    return this.request<any>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async echoPost(postId: string) {
    return this.request<any>(`/posts/${postId}/echo`, {
      method: 'POST',
    });
  }

  async replyPost(postId: string, content: string) {
    return this.request<any>(`/posts/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Conversation endpoints
  async getConversations() {
    return this.request<any[]>('/conversations');
  }

  async getMessages(conversationId: string) {
    return this.request<any[]>(`/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async createConversation(userId: string) {
    return this.request<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Notification endpoints
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async markNotificationRead(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', {
      method: 'POST',
    });
  }

  // Marketplace endpoints
  async getMarketplaceItems() {
    return this.request<any[]>('/marketplace');
  }

  async buyItem(itemId: string) {
    return this.request<any>(`/marketplace/${itemId}/buy`, {
      method: 'POST',
    });
  }

  // Companion endpoints
  async interactWithCompanion(action: 'feed' | 'play' | 'pet') {
    return this.request<any>('/companions/interact', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Stories
  async getStories() {
    return this.request<any[]>('/stories');
  }

  async createStory(content: string, type: 'image' | 'video' | 'text') {
    return this.request<any>('/stories', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async viewStory(storyId: string) {
    return this.request<any>(`/stories/${storyId}/view`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

// Helper to map API user format to frontend User type
export function mapApiUserToUser(apiUser: any): any {
  if (!apiUser) return null;
  
  return {
    username: apiUser.username,
    email: apiUser.email,
    avatar: apiUser.avatar,
    bio: apiUser.bio,
    birthday: apiUser.birthday,
    location: apiUser.location,
    website: apiUser.website,
    pronouns: apiUser.pronouns,
    coverImage: apiUser.coverImage || apiUser.cover_image,
    followers: apiUser.followers_count || apiUser.followers || 0,
    following: apiUser.following_count || apiUser.following || 0,
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

// Helper to map API post format to frontend Post type
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

// Helper to map API story format to frontend Story type
export function mapApiStoryToStory(apiStory: any): any {
  return {
    id: apiStory.id,
    userId: apiStory.userId || apiStory.user_id,
    content: apiStory.content,
    type: apiStory.type,
    timestamp: new Date(apiStory.createdAt || apiStory.created_at),
    expiresAt: new Date(apiStory.expiresAt || apiStory.expires_at),
    viewers: apiStory.viewers || [],
    author: apiStory.author ? mapApiUserToUser(apiStory.author) : undefined,
  };
}
