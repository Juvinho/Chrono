import { API_BASE_URL } from './client.js';
import { AdminUser, AdminOverallStats } from '../types/admin.js';

export const adminUserService = {
  async getAllUsers(token: string): Promise<AdminUser[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data.users;
  },

  async getUserDetails(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    return await response.json();
  },

  async updateUser(userId: string, updates: Partial<AdminUser>, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    return await response.json();
  },

  async deleteUser(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    return await response.json();
  },

  async banUser(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to ban user');
    }

    return await response.json();
  },

  async unbanUser(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unban user');
    }

    return await response.json();
  },

  async resetPassword(userId: string, newPassword: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }

    return await response.json();
  },

  async getStats(token: string): Promise<AdminOverallStats> {
    const response = await fetch(`${API_BASE_URL}/admin/users/stats/overview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    return data.stats;
  },
};
