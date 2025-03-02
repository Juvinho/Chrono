import { baseClient } from './client';

export const authService = {
  async login(credentials: any) {
    return baseClient.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(userData: any) {
    return baseClient.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    baseClient.setToken(null);
    return { data: { success: true } };
  },

  async getMe() {
    return baseClient.request<any>('/auth/me');
  },

  async updateProfile(data: any) {
    return baseClient.request<any>('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async checkUsername(username: string) {
    return baseClient.request<any>('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async checkEmail(email: string) {
    return baseClient.request<any>('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyEmail(token: string) {
    return baseClient.request<any>(`/auth/verify-email?token=${token}`, {
      method: 'GET',
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return baseClient.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
