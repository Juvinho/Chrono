
import { User, Post, NotificationType } from '../types';

export const NotificationManager = {
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },

  showNotification: (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            ...options
        });
        n.onclick = function(event) {
            event.preventDefault(); // prevent the browser from focusing the Notification's tab
            window.focus();
            if (options?.data?.url) {
                // You can handle navigation here if needed, but simple window focus is good for now
            }
        }
      } catch (e) {
        console.error("Notification error:", e);
      }
    }
  },

  formatNotificationMessage: (type: NotificationType, actor: User, post?: Post): string => {
    const actorName = actor.username;
    switch (type) {
      case 'reply':
        return `${actorName} replied to your post`;
      case 'reaction':
        return `${actorName} reacted to your post`;
      case 'follow':
        return `${actorName} started following you`;
      case 'mention':
        return `${actorName} mentioned you`;
      case 'repost':
        return `${actorName} echoed your post`;
      case 'directMessage':
        return `${actorName} sent you a message`;
      default:
        return `New notification from ${actorName}`;
    }
  }
};
