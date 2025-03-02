import { baseClient } from './client';

export const companionService = {
  async getCompanion() {
    return baseClient.request<any>('/companions');
  },

  async createCompanion(name: string, type: string) {
    return baseClient.request<any>('/companions', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  },

  async interactWithCompanion(action: 'feed' | 'play' | 'pet') {
    return baseClient.request<any>('/companions/interact', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
};
