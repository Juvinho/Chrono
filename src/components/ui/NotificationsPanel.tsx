import React from 'react';
import { Notification, NotificationType } from '../../types/index';
import { ReplyIcon, EchoIcon, GlitchIcon, UserIcon, CheckCircleIcon, CloseIcon } from './icons';
import { useTranslation } from '../../hooks/useTranslation';

interface NotificationsPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onNotificationClick: (notification: Notification) => void;
}

interface AggregatedNotification {
    id: string;
    key: string;
    notificationType: NotificationType;
    actors: any[];
    post?: any;
    timestamp: Date;
    read: boolean;
}

const NotificationItem: React.FC<{ 
    notification: AggregatedNotification, 
    onNotificationClick: (notification: any) => void
}> = ({ notification, onNotificationClick }) => {
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
        const actorNames = notification.actors.map(a => a.username);
        let actorText: React.ReactNode;
        
        if (actorNames.length === 1) {
            actorText = <strong className="text-[var(--theme-text-light)]">@{actorNames[0]}</strong>;
        } else if (actorNames.length === 2) {
            actorText = (
                <>
                    <strong className="text-[var(--theme-text-light)]">@{actorNames[0]}</strong> {t('and')} <strong className="text-[var(--theme-text-light)]">@{actorNames[1]}</strong>
                </>
            );
        } else {
            actorText = (
                <>
                    <strong className="text-[var(--theme-text-light)]">@{actorNames[0]}</strong> {t('and')} {actorNames.length - 1} {t('others')}
                </>
            );
        }

        switch (notification.notificationType) {
            case 'reply': return <>{actorText} {t('notifReplied')}</>;
            case 'repost': return <>{actorText} {t('notifEchoed')}</>;
            case 'follow': return <>{actorText} {t('notifFollowed')}</>;
            case 'reaction': return <>{actorText} {t('notifReacted')}</>;
            default: return t('notifDefault');
        }
    }

    return (
        <div 
            onClick={() => onNotificationClick(notification)}
            className={`notification-item flex items-start p-3 space-x-3 transition-colors cursor-pointer border-b border-[var(--theme-border-primary)]/30 ${notification.read ? 'read opacity-70' : 'bg-[var(--theme-primary)]/5'}`}
        >
            <div className="flex-shrink-0 mt-1">{renderIcon()}</div>
            <div className="flex-grow">
                <p className="text-sm text-[var(--theme-text-primary)]">{renderText()}</p>
                {notification.post && (
                    <p className="notification-post-preview mt-1 italic text-xs opacity-60 line-clamp-1">
                        "{notification.post.content}"
                    </p>
                )}
                <p className="text-[10px] text-[var(--theme-text-secondary)] mt-1 uppercase tracking-tighter">{notification.timestamp.toLocaleTimeString()}</p>
            </div>
        </div>
    );
}

export default function NotificationsPanel({ notifications, onClose, onNotificationClick }: NotificationsPanelProps) {
    const { t } = useTranslation();

    // Aggregate notifications
    const aggregatedNotifications = React.useMemo(() => {
        const groups: { [key: string]: AggregatedNotification } = {};
        
        notifications.forEach(n => {
            // Group by type and post, but only for certain types
            let key = n.notificationType;
            if (n.post?.id) {
                key += `-${n.post.id}`;
            } else if (n.notificationType === 'follow') {
                key += '-global-follow'; 
            } else {
                key += `-${n.id}`; // Don't group if no post and not a follow
            }

            if (!groups[key]) {
                groups[key] = {
                    id: n.id,
                    key,
                    notificationType: n.notificationType,
                    actors: [n.actor],
                    post: n.post,
                    timestamp: n.timestamp,
                    read: n.read
                };
            } else {
                // Only add actor if not already in the list
                if (!groups[key].actors.some(a => a.username === n.actor.username)) {
                    groups[key].actors.push(n.actor);
                }
                // Keep the most recent timestamp
                if (n.timestamp > groups[key].timestamp) {
                    groups[key].timestamp = n.timestamp;
                }
                // If any in group is unread, the whole group is unread
                if (!n.read) {
                    groups[key].read = false;
                }
            }
        });

        return Object.values(groups).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [notifications]);

    return (
        <div className="notifications-panel">
            <div className="p-3 border-b border-[var(--theme-border-primary)] flex justify-between items-center">
                <h3 className="font-bold text-[var(--theme-text-light)] glitch-effect" data-text={t('notificationsTitle')}>{t('notificationsTitle')}</h3>
                <button onClick={onClose} className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">{t('close')}</button>
            </div>
            {aggregatedNotifications.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    {aggregatedNotifications.map(n => (
                        <NotificationItem 
                            key={n.key} 
                            notification={n} 
                            onNotificationClick={onNotificationClick}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-4 text-center text-sm text-[var(--theme-text-secondary)]">
                    {t('noNewTransmissions')}
                </div>
            )}
        </div>
    );
}

