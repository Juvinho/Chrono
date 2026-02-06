import { authService } from './auth.service';
import { postService } from './post.service';
import { userService } from './user.service';
import { notificationService } from './notification.service';
import { marketplaceService } from './marketplace.service';
import { companionService } from './companion.service';
import { conversationService } from './conversation.service';
import { baseClient } from './client';

export const api = {
  auth: authService,
  posts: postService,
  users: userService,
  notifications: notificationService,
  marketplace: marketplaceService,
  companion: companionService,
  conversations: conversationService,
  client: baseClient,
};

// Compatibility layer for old apiClient
export const apiClient = {
  ...authService,
  ...postService,
  ...userService,
  ...notificationService,
  ...marketplaceService,
  ...companionService,
  ...conversationService,
  setToken: (token: string | null) => baseClient.setToken(token),
  getToken: () => baseClient.getToken(),
};

export * from './mappers';
export * from './client';
export * from './auth.service';
export * from './post.service';
export * from './user.service';
export * from './notification.service';
export * from './marketplace.service';
export * from './companion.service';
