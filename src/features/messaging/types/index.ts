// Types principais do sistema de mensagens

export interface User {
  id: number | string;
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
  id: number | string;
  otherUser: User;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: number | string;
  conversationId: number | string;
  sender: User;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface SendMessageRequest {
  conversationId: number | string;
  content: string;
}
