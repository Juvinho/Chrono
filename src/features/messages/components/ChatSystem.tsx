import React from 'react';
import { User, Conversation } from '../../../types/index';
import ChatWindow from './ChatWindow';

interface ChatSystemProps {
  currentUser: User;
  allUsers: User[];
  conversations: Conversation[];
  openChatUsernames: string[];
  minimizedChatUsernames: string[];
  onCloseChat: (username: string) => void;
  onMinimizeChat: (username: string) => void;
  onSendMessage: (recipientUsername: string, text: string, media?: { imageUrl?: string, videoUrl?: string }) => void;
  onMarkAsRead: (conversationId: string) => void;
}

export default function ChatSystem({
  currentUser,
  allUsers,
  conversations,
  openChatUsernames,
  minimizedChatUsernames,
  onCloseChat,
  onMinimizeChat,
  onSendMessage,
  onMarkAsRead
}: ChatSystemProps) {
  if (!currentUser || openChatUsernames.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex items-end space-x-4 pointer-events-none">
      {openChatUsernames.map(username => {
        const otherUser = allUsers.find(u => u.username === username);
        if (!otherUser) return null;

        const conversation = conversations.find(c => 
          c.participants.includes(username) && c.participants.includes(currentUser.username)
        ) || null;

        const isMinimized = minimizedChatUsernames.includes(username);

        return (
          <div key={username} className="pointer-events-auto">
            <ChatWindow
              currentUser={currentUser}
              otherUser={otherUser}
              conversation={conversation}
              onClose={() => onCloseChat(username)}
              onMinimize={() => onMinimizeChat(username)}
              onSendMessage={onSendMessage}
              onMarkAsRead={onMarkAsRead}
              isMinimized={isMinimized}
            />
          </div>
        );
      })}
    </div>
  );
}
