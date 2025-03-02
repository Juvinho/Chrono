import { baseClient } from './client';

export const storyService = {
  async getStories() {
    return baseClient.request<any[]>('/stories');
  },

  async createStory(content: string, type: 'image' | 'video' | 'text') {
    return baseClient.request<any>('/stories', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  },

  async viewStory(storyId: string) {
    return baseClient.request<any>(`/stories/${storyId}/view`, {
      method: 'POST',
    });
  },
};
