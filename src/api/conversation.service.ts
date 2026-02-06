import { baseClient, API_BASE_URL } from './client';

export const conversationService = {
  async getConversations() {
    return baseClient.request<any[]>('/chat');
  },

  async getMessages(conversationId: string, opts?: { before?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return baseClient.request<any[]>(`/conversations/${conversationId}/messages${qs}`);
  },

  async createConversation(targetUserId: string) {
    return baseClient.request<any>('/chat/init', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async getOrCreateConversation(targetUserId: string) {
    return baseClient.request<any>('/chat/init', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async sendMessage(conversationId: string, text: string, media?: { imageUrl?: string; videoUrl?: string; metadata?: any }) {
    return baseClient.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, media }),
    });
  },

  // typing endpoint não está implementado no backend atual
  async sendTyping(_conversationId: string) {
    return { data: { ok: true } };
  },

  // mark as read endpoint não está implementado no backend atual
  async markConversationAsRead(_conversationId: string) {
    return { data: { ok: true } };
  },

  // update status endpoint não está implementado no backend atual
  async updateMessageStatus(_conversationId: string, _messageId: string, _status: 'delivered' | 'read') {
    return { data: { ok: true } };
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
