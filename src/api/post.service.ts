import { baseClient } from './client';

export const postService = {
  async getPosts(options: any = {}) {
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit.toString());
    if (options.offset) queryParams.append('offset', options.offset.toString());
    if (options.author) queryParams.append('author', options.author);
    if (options.inReplyTo) queryParams.append('inReplyTo', options.inReplyTo);

    return baseClient.request<any[]>(`/posts?${queryParams.toString()}`);
  },

  async getPost(id: string) {
    return baseClient.request<any>(`/posts/${id}`);
  },

  async createPost(postData: any) {
    return baseClient.request<any>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  async deletePost(postId: string) {
    return baseClient.request<any>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  async likePost(postId: string) {
    return baseClient.request<any>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  },

  async echoPost(postId: string) {
    return baseClient.request<any>(`/posts/${postId}/echo`, {
      method: 'POST',
    });
  },

  async updatePost(postId: string, data: any) {
    return baseClient.request<any>(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateReaction(postId: string, reaction: string) {
    return baseClient.request<any>(`/posts/${postId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  },

  async replyToPost(postId: string, content: string, isPrivate: boolean = false, media?: { imageUrl?: string, videoUrl?: string }) {
    return baseClient.request<any>(`/posts/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content, isPrivate, ...media }),
    });
  },

  async votePoll(postId: string, optionIndex: number) {
    return baseClient.request<any>(`/posts/${postId}/poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndex }),
    });
  },
};
