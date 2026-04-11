// Types principais do sistema de mensagens

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline?: boolean;
}

export interface MessagePreview {
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string; // UUID string, never number
  otherUser: User;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string; // UUID string, never number
  sender: User;
  content: string;
  imageUrl?: string; // Support for image attachments
  sentAt: string;
  isRead: boolean;
}

export interface SendMessageRequest {
  conversationId: string; // UUID string, never number
  content: string;
  imageUrl?: string;
}
