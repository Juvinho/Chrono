import { baseClient } from './client';

export const notificationService = {
  async getNotifications() {
    return baseClient.request<any[]>('/notifications');
  },

  async markNotificationRead(notificationId: string) {
    return baseClient.request<any>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead() {
    return baseClient.request<any>('/notifications/read-all', {
      method: 'POST',
    });
  },
};
