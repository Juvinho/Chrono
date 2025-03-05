import { baseClient } from './client';

export const userService = {
  async getUser(username: string) {
    return baseClient.request<any>(`/users/${username}`);
  },

  async updateUser(username: string, data: any) {
    return baseClient.request<any>(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async searchUsers(query: string) {
    const q = query.trim();
    const endpoint = q ? `/users/search/${encodeURIComponent(q)}` : '/users/search/recommended';
    return baseClient.request<any[]>(endpoint);
  },

  async followUser(userId: string) {
    return baseClient.request<any>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  },

  async unfollowUser(userId: string) {
    return baseClient.request<any>(`/users/${userId}/unfollow`, {
      method: 'POST',
    });
  },

  async sendGlitchi(username: string) {
    return baseClient.request<any>(`/users/${username}/glitchi`, {
      method: 'POST',
    });
  },

  async sendMessage(conversationId: string, text: string, media?: { imageUrl?: string, videoUrl?: string, glitchiType?: string }) {
    return baseClient.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, ...media }),
    });
  },
};
