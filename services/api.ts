// API Client for Chrono Backend

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `http://${window.location.hostname}:3001/api`;
    }
    // In production, use relative path since backend serves frontend
    return '/api';
  }
  return 'http://localhost:3001/api';
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
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

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
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        return { error: `Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando em ${API_BASE_URL.replace('/api', '')}. Verifique o console para mais detalhes.` };
      }
      return { error: error.message || 'Erro de rede' };
    }
  }

  // Auth endpoints
  async register(username: string, email: string, password: string, avatar?: string, captchaVerified?: boolean) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, avatar, captchaVerified }),
    });
  }

  async login(username: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async verify(email: string) {
    return this.request<{ user: any }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }
  
  async replyToPost(parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }) {
    return this.createPost({
      content,
      isPrivate,
      inReplyToId: parentPostId,
      ...media
    });
  }
  
  async echoPost(postId: string) {
    return this.createPost({
      content: '',
      repostOfId: postId,
    });
  }

  // User endpoints
  async getUser(username: string) {
    return this.request<any>(`/users/${username}`);
  }

  async searchUsers(query: string) {
    return this.request<any[]>(`/users/search/${encodeURIComponent(query)}`);
  }

  async updateUser(username: string, updates: any) {
    return this.request<any>(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async followUser(username: string) {
    return this.request<{ message: string; isFollowing: boolean }>(`/users/${username}/follow`, {
      method: 'POST',
    });
  }

  // Post endpoints
  async getPosts(options?: { limit?: number; offset?: number; author?: string; inReplyTo?: string | null }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.author) params.append('author', options.author);
    if (options?.inReplyTo !== undefined) params.append('inReplyTo', options.inReplyTo || 'null');

    const query = params.toString();
    return this.request<any[]>(`/posts${query ? `?${query}` : ''}`);
  }

  async getPost(id: string) {
    return this.request<any>(`/posts/${id}`);
  }

  async createPost(post: {
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    isThread?: boolean;
    isPrivate?: boolean;
    inReplyToId?: string;
    repostOfId?: string;
    pollOptions?: { option: string; votes: number }[];
    pollEndsAt?: Date;
    unlockAt?: Date;
    timestamp?: Date;
  }) {
    return this.request<any>('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async updatePost(id: string, updates: any) {
    return this.request<any>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePost(id: string) {
    return this.request<{ message: string }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  }
  
  async updateReaction(postId: string, reactionType: string) {
    return this.addReaction(postId, reactionType);
  }

  async addReaction(postId: string, reactionType: string) {
    return this.request<{ reactions: any }>(`/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    });
  }

  async voteOnPoll(postId: string, optionIndex: number) {
    return this.request<{ voters: any }>(`/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndex }),
    });
  }
  
  async votePoll(postId: string, optionIndex: number) {
    return this.voteOnPoll(postId, optionIndex);
  }

  // Conversation endpoints
  async getConversations() {
    return this.request<any[]>('/conversations');
  }

  async getOrCreateConversation(username: string, options?: { isEncrypted?: boolean, selfDestructTimer?: number }) {
    if (options) {
        return this.request<{ conversationId: string }>('/conversations', {
            method: 'POST',
            body: JSON.stringify({ username, ...options })
        });
    }
    return this.request<{ conversationId: string }>(`/conversations/with/${username}`);
  }

  async toggleFollow(username: string) {
    return this.request<{ message: string; isFollowing: boolean }>(`/users/${username}/follow`, {
      method: 'POST',
    });
  }

  async echoPost(postId: string) {
    return this.createPost({ content: '', repostOfId: postId });
  }

  async sendMessage(conversationId: string, text: string) {
    return this.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }
  
  async sendMessageToUser(username: string, text: string) {
    const conv = await this.getOrCreateConversation(username);
    const conversationId = (conv.data && (conv.data.conversationId || conv.data.id)) || '';
    if (!conversationId) {
      return { error: 'Failed to create or find conversation' };
    }
    return this.sendMessage(conversationId, text);
  }

  async markConversationAsRead(conversationId: string) {
    return this.request<{ message: string }>(`/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    });
  }

  // Stories endpoints
  async getStories() {
    return this.request<any[]>('/stories', {
      method: 'GET',
    });
  }

  async createStory(content: string, type: 'image' | 'video' | 'text') {
    return this.request<any>('/stories', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async viewStory(storyId: string) {
    return this.request<{ success: boolean }>(`/stories/${storyId}/view`, {
      method: 'POST',
    });
  }

  // Marketplace endpoints
  async getItems(type?: string) {
    const query = type ? `?type=${type}` : '';
    return this.request<any[]>(`/marketplace/items${query}`);
  }

  async getUserInventory() {
    return this.request<any[]>('/marketplace/inventory');
  }

  async purchaseItem(itemId: string) {
    return this.request<any>(`/marketplace/items/${itemId}/purchase`, {
      method: 'POST',
    });
  }

  async equipItem(itemId: string) {
    return this.request<any>(`/marketplace/items/${itemId}/equip`, {
      method: 'POST',
    });
  }

  async unequipItem(itemId: string) {
    return this.request<any>(`/marketplace/items/${itemId}/unequip`, {
      method: 'POST',
    });
  }

  async purchaseSubscription(tier: 'pro' | 'pro_plus') {
    return this.request<any>('/marketplace/subscription', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  // Companion endpoints
  async getCompanion() {
    return this.request<any>('/companions');
  }

  async createCompanion(name: string, type: string) {
    return this.request<any>('/companions', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }

  async interactWithCompanion(action: 'feed' | 'play' | 'pet') {
    return this.request<any>('/companions/interact', {
      method: 'POST',
      body: JSON.stringify({ action }),
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
