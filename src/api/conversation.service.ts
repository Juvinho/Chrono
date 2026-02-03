import { baseClient } from './client';

export const conversationService = {
  async getConversations() {
    return baseClient.request<any[]>('/conversations');
  },

  async getMessages(conversationId: string) {
    return baseClient.request<any[]>(`/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: string, text: string, media?: { imageUrl?: string, videoUrl?: string, metadata?: any }) {
    return baseClient.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, media }),
    });
  },

  async getOrCreateConversation(username: string, options: any = {}) {
    return baseClient.request<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ username, ...options }),
    });
  },

  async markConversationAsRead(conversationId: string) {
    return baseClient.request<any>(`/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },

  async updateMessageStatus(conversationId: string, messageId: string, status: 'delivered' | 'read') {
    return baseClient.request<any>(`/conversations/${conversationId}/messages/${messageId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};
