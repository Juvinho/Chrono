import React from 'react';
import { Notification } from '../types';
import { ReplyIcon, EchoIcon, GlitchIcon, UserIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface NotificationsPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const NotificationItem: React.FC<{ notification: Notification, onNotificationClick: (notification: Notification) => void }> = ({ notification, onNotificationClick }) => {
    const { t } = useTranslation();
    const renderIcon = () => {
        switch (notification.notificationType) {
            case 'reply': return <ReplyIcon className="w-5 h-5 text-[var(--theme-primary)]" />;
            case 'repost': return <EchoIcon className="w-5 h-5 text-green-500" />;
            case 'follow': return <UserIcon className="w-5 h-5 text-blue-500" />;
            case 'reaction': return <GlitchIcon className="w-5 h-5 text-yellow-500" />;
            default: return null;
        }
    };
    
    const renderText = () => {
        const actor = <strong className="text-[var(--theme-text-light)]">@{notification.actor.username}</strong>;
        switch (notification.notificationType) {
            case 'reply': return <>{actor} {t('notifReplied')}</>;
            case 'repost': return <>{actor} {t('notifEchoed')}</>;
            case 'follow': return <>{actor} {t('notifFollowed')}</>;
            case 'reaction': return <>{actor} {t('notifReacted')}</>;
            default: return t('notifDefault');
        }
    }

    return (
        <div 
            onClick={() => onNotificationClick(notification)}
            className={`notification-item flex items-start p-3 space-x-3 transition-colors cursor-pointer ${notification.read ? 'read' : ''}`}
        >
            <div className="flex-shrink-0 mt-1">{renderIcon()}</div>
            <div className="flex-grow">
                <p className="text-sm text-[var(--theme-text-primary)]">{renderText()}</p>
                {notification.post && (
                    <p className="notification-post-preview">
                        "{notification.post.content}"
                    </p>
                )}
                <p className="text-xs text-[var(--theme-text-secondary)] mt-1">{notification.timestamp.toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onNotificationClick }) => {
    const { t } = useTranslation();
    return (
        <div className="notifications-panel">
            <div className="p-3 border-b border-[var(--theme-border-primary)] flex justify-between items-center">
                {/* FIX: Use 'notificationsTitle' to avoid duplicate translation key */}
                <h3 className="font-bold text-[var(--theme-text-light)] glitch-effect" data-text={t('notificationsTitle')}>{t('notificationsTitle')}</h3>
                <button onClick={onClose} className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">{t('close')}</button>
            </div>
            {notifications.length > 0 ? (
                <div>
                    {notifications.map(n => <NotificationItem key={n.id} notification={n} onNotificationClick={onNotificationClick} />)}
                </div>
            ) : (
                <div className="p-4 text-center text-sm text-[var(--theme-text-secondary)]">
                    {t('noNewTransmissions')}
                </div>
            )}
        </div>
    );
};

export default NotificationsPanel;