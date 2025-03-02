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

  async requestConnection(username: string) {
    return baseClient.request<any>(`/users/${username}/connect`, {
      method: 'POST',
    });
  },

  async acceptConnection(requestId: string) {
    return baseClient.request<any>(`/connections/${requestId}/accept`, {
      method: 'POST',
    });
  },

  async declineConnection(requestId: string) {
    return baseClient.request<any>(`/connections/${requestId}/decline`, {
      method: 'POST',
    });
  },

  async getConnections() {
    return baseClient.request<any[]>('/users/me/connections');
  },
};
