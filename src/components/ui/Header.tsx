import React, { useState, useMemo } from 'react';
import { User, Post, Page, Notification, Conversation } from '../../types/index';
import GlitchText from './GlitchText';
import { SearchIcon, LogoutIcon, BellIcon, SettingsIcon, MessageIcon, FilmIcon, ShoppingBagIcon, ChevronLeftIcon } from './icons';
import SearchOverlay from './SearchOverlay';
import NotificationsPanel from './NotificationsPanel';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from '../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../../features/profile/components/FramePreview';
import Avatar from '../../features/profile/components/Avatar';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    onViewProfile: (username: string) => void;
    onNavigate: (page: Page, data?: string) => void;
    onNotificationClick: (notification: Notification) => void;
    onSearch: (query: string) => void;
    onOpenMarketplace?: () => void;
    onBack?: () => void;
    allUsers: User[];
    allPosts: Post[];
    conversations: Conversation[];
}

export default function Header({ user, onLogout, onViewProfile, onNavigate, onNotificationClick, onSearch, onOpenMarketplace, onBack, allUsers, allPosts, conversations }: HeaderProps) {
    const { t } = useTranslation();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handlePerformSearch = (query: string) => {
        setIsSearchOpen(false);
        onSearch(query);
    };

    const unreadNotificationCount = useMemo(() => {
        return user.notifications?.filter(n => !n.read).length || 0;
    }, [user.notifications]);

    const unreadMessageCount = useMemo(() => {
        if (!conversations) return 0;
        return conversations.reduce((acc, convo) => {
            return acc + (convo.unreadCount?.[user.username] || 0);
        }, 0);
    }, [conversations, user.username]);

    return (
        <header className="h-16 bg-[var(--theme-bg-primary)] border-b-2 border-[var(--theme-border-primary)] z-50 relative flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center space-x-4">
                {onBack && (
                    <button 
                        onClick={onBack} 
                        className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] p-1 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-all"
                        title={t('back') || 'Voltar'}
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                )}
                <div className="cursor-pointer" onClick={() => onNavigate(Page.Dashboard)}>
                  <GlitchText text="C." className="logo-glitch text-4xl font-bold tracking-tighter" />
                </div>
            </div>
            
            <div className="relative w-1/3">
                 <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="w-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm py-1 px-3 text-left text-[var(--theme-text-secondary)] flex justify-between items-center hover:border-[var(--theme-primary)] transition-colors"
                >
                    <span>{t('searchPlaceholder')}</span>
                    <SearchIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex items-center space-x-4">
                 <button onClick={() => onNavigate(Page.VideoAnalysis)} title={t('dataSlicer')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-secondary)] p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors hidden sm:block">
                    <FilmIcon className="w-5 h-5 md:w-6 md:h-6" />
                 </button>
                 {/* DM icon removed as per request */}
                 {onOpenMarketplace && (
                    <button onClick={onOpenMarketplace} title={t('marketplace')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-secondary)] p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                        <ShoppingBagIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                 )}
                 <div className="relative">
                    <button onClick={() => setIsNotificationsOpen(prev => !prev)} title={t('notifications')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-secondary)] p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                        <BellIcon className="w-5 h-5 md:w-6 md:h-6" />
                        {unreadNotificationCount > 0 && (
                            <span className="absolute top-1 right-1 w-3 h-3 md:w-4 md:h-4 bg-red-600 text-white text-[10px] md:text-xs rounded-full flex items-center justify-center animate-pulse">
                                {unreadNotificationCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && user.notifications && (
                        <NotificationsPanel 
                            notifications={user.notifications}
                            onClose={() => setIsNotificationsOpen(false)}
                            onNotificationClick={onNotificationClick}
                        />
                    )}
                 </div>
                 <button onClick={() => onNavigate(Page.Settings)} title={t('settings')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-secondary)] p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors hidden sm:block">
                    <SettingsIcon className="w-5 h-5 md:w-6 md:h-6" />
                 </button>
                 <button onClick={() => onViewProfile(user.username)} className="flex items-center space-x-2 group ml-1">
                    <div className="relative w-8 h-8 md:w-8 md:h-8">
                        {(() => {
                            const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                            return (
                                <>
                                    <Avatar src={user.avatar} username={user.username} className={`w-full h-full ${avatarShape} border-2 border-[var(--theme-border-primary)] group-hover:border-[var(--theme-primary)] transition-colors object-cover`} />
                                    
                                    {/* Effect Overlay */}
                                    {user.equippedEffect && (
                                        <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                            <img 
                                                src={user.equippedEffect.imageUrl} 
                                                alt="" 
                                                className="w-full h-full object-cover animate-pulse-soft"
                                            />
                                        </div>
                                    )}

                                    {/* Frame Overlay */}
                                    {user.equippedFrame && (
                                        <div className="absolute -inset-1 z-20 pointer-events-none">
                                            <FramePreview item={user.equippedFrame} />
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                    <span className="text-[var(--theme-text-light)] group-hover:text-[var(--theme-primary)] transition-colors hidden lg:inline">@{user.username}</span>
                </button>
                 <button onClick={() => setShowLogoutConfirm(true)} title={t('logout')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-secondary)] p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors hidden md:block">
                    <LogoutIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>

            {isSearchOpen && (
                <SearchOverlay 
                    onClose={() => setIsSearchOpen(false)}
                    onSearch={handlePerformSearch}
                    onViewProfile={(username) => {
                        setIsSearchOpen(false);
                        onViewProfile(username);
                    }}
                    allUsers={allUsers}
                    allPosts={allPosts}
                    currentUser={user}
                />
            )}
            
            {showLogoutConfirm && (
                <ConfirmationModal
                    onCancel={() => setShowLogoutConfirm(false)}
                    onConfirm={() => {
                        setShowLogoutConfirm(false);
                        onLogout();
                    }}
                    title={t('logoutConfirmTitle')}
                    message={t('logoutConfirmMessage')}
                    confirmText={t('logout')}
                    cancelText={t('cancel')}
                />
            )}
        </header>
    );
}
