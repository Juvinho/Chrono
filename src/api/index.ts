import { authService } from './auth.service';
import { postService } from './post.service';
import { userService } from './user.service';
import { conversationService } from './conversation.service';
import { notificationService } from './notification.service';
import { marketplaceService } from './marketplace.service';
import { storyService } from './story.service';
import { companionService } from './companion.service';
import { baseClient } from './client';

export const api = {
  auth: authService,
  posts: postService,
  users: userService,
  conversations: conversationService,
  notifications: notificationService,
  marketplace: marketplaceService,
  stories: storyService,
  companion: companionService,
  client: baseClient,
};

// Compatibility layer for old apiClient
export const apiClient = {
  ...authService,
  ...postService,
  ...userService,
  ...conversationService,
  ...notificationService,
  ...marketplaceService,
  ...storyService,
  ...companionService,
  setToken: (token: string | null) => baseClient.setToken(token),
  getToken: () => baseClient.getToken(),
};

export * from './mappers';
export * from './client';
export * from './auth.service';
export * from './post.service';
export * from './user.service';
export * from './conversation.service';
export * from './notification.service';
export * from './marketplace.service';
export * from './story.service';
export * from './companion.service';
