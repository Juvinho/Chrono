import { baseClient } from './client';

export const conversationService = {
  async getConversations() {
    return baseClient.request<any[]>('/conversations');
  },

  async getMessages(conversationId: string, opts?: { before?: string, limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return baseClient.request<any[]>(`/conversations/${conversationId}/messages${qs}`);
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

  async sendMessageToUser(recipientUsername: string, text: string, media?: { imageUrl?: string, videoUrl?: string, metadata?: any }) {
    try {
      // First get or create conversation
      const conv = await this.getOrCreateConversation(recipientUsername);
      
      if (conv.error) {
        console.error('Erro ao criar/buscar conversa:', conv.error);
        return { error: conv.error };
      }
      
      if (!conv.data) {
        console.error('Resposta sem data:', conv);
        return { error: 'Não foi possível criar ou encontrar a conversa' };
      }
      
      // O backend pode retornar conversationId ou id
      const conversationId = conv.data.conversationId || conv.data.id;
      if (!conversationId) {
        console.error('ID da conversa não encontrado na resposta:', conv.data);
        return { error: 'ID da conversa não encontrado na resposta do servidor' };
      }
      
      console.log('Enviando mensagem para conversa:', conversationId);
      const result = await this.sendMessage(conversationId, text, media);
      console.log('Resultado do envio:', result);
      
      return result;
    } catch (error: any) {
      console.error('Erro em sendMessageToUser:', error);
      return { error: error.message || 'Erro ao enviar mensagem' };
    }
  },
};
