import { baseClient, API_BASE_URL } from './client';

export const conversationService = {
  async getConversations() {
    return baseClient.request<any[]>('/conversations');
  },

  async getMessages(conversationId: string, opts?: { before?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return baseClient.request<any[]>(`/conversations/${conversationId}/messages${qs}`);
  },

  async createConversation(username: string, options: any = {}) {
    return baseClient.request<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ username, ...options }),
    });
  },

  async getOrCreateConversation(username: string, options: any = {}) {
    return baseClient.request<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ username, ...options }),
    });
  },

  async sendMessage(conversationId: string, text: string, media?: { imageUrl?: string; videoUrl?: string; metadata?: any }) {
    return baseClient.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, media }),
    });
  },

  async sendTyping(conversationId: string) {
    return baseClient.request<any>(`/conversations/${conversationId}/typing`, {
      method: 'POST',
      body: JSON.stringify({}),
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

  subscribe(conversationId: string, handlers: { onMessages?: (msgs: any[]) => void; onTyping?: (data: { users: string[] }) => void }) {
    const es = new EventSource(`${API_BASE_URL}/conversations/${conversationId}/stream`, { withCredentials: true } as any);
    es.addEventListener('messages', (e: MessageEvent) => {
      try {
        const data = JSON.parse((e as any).data);
        handlers.onMessages && handlers.onMessages(data);
      } catch {}
    });
    es.addEventListener('typing', (e: MessageEvent) => {
      try {
        const data = JSON.parse((e as any).data);
        handlers.onTyping && handlers.onTyping(data);
      } catch {}
    });
    return es;
  },
};
