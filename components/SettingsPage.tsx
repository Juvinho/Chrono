import React, { useState, useRef, useEffect } from 'react';
import { User, Page, Post, ProfileSettings, Notification, Conversation, Item } from '../types';
import Header from './Header';
import Avatar from './Avatar';
import { BlockIcon, FlagIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { ImageCropper } from './ImageCropper';
import FramePreview, { getFrameShape } from './FramePreview';
import { apiClient } from '../services/api';

// FIX: Add a default settings object to fall back on.
const defaultSettings: Omit<ProfileSettings, 'coverImage'> = {
  theme: 'light',
  accentColor: 'purple',
  effect: 'none',
  animationsEnabled: true,
  borderRadius: 'md',
  autoRefreshEnabled: false,
  autoRefreshInterval: 5,
};

const COVER_PRESETS = [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535868463750-c78d9543614f?w=1200&h=400&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=400&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515630278258-407f66498911?w=1200&h=400&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506318137071-a8bcbf6d0b36?w=1200&h=400&fit=crop&q=80',
];

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (page: Page, username?: string) => void;
  onNotificationClick: (notification: Notification) => void;
  onUpdateUser: (user: User) => Promise<boolean>;
  allUsers: User[];
  allPosts: Post[];
  conversations: Conversation[];
  onOpenMarketplace?: () => void;
}

export default function SettingsPage({ user, onLogout, onNavigate, onNotificationClick, onUpdateUser, allUsers, allPosts, conversations, onOpenMarketplace }: SettingsPageProps) {
  const { t, setLanguage, language } = useTranslation();

  // FIX: Safely initialize draftUser state to ensure profileSettings always exists.
  // This prevents crashes when updating settings for users who don't have a profileSettings object yet.
  const [draftUser, setDraftUser] = useState<User>(() => ({
    ...user,
    // Ensure birthday is in YYYY-MM-DD format for the date input
    birthday: user.birthday ? (user.birthday.includes('T') ? user.birthday.split('T')[0] : user.birthday) : '',
    profileSettings: {
        ...defaultSettings,
        ...(user.profileSettings || {})
    }
  }));

  // Update draftUser when user prop changes, preserving local edits if needed? 
  // For now, let's reset to user prop to keep in sync
  useEffect(() => {
    setDraftUser({
        ...user,
        birthday: user.birthday ? (user.birthday.includes('T') ? user.birthday.split('T')[0] : user.birthday) : '',
        profileSettings: {
            ...defaultSettings,
            ...(user.profileSettings || {})
        }
    });
  }, [user]);

  const [activeTab, setActiveTab] = useState<'account' | 'profile' | 'appearance' | 'feed'>('account');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<'avatar' | 'cover'>('avatar');
  
  // New state for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDraftUser(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSettingChange = (setting: keyof ProfileSettings, value: any) => {
    setDraftUser(prev => ({
      ...prev,
      profileSettings: {
        ...prev.profileSettings!,
        [setting]: value
      }
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImage(reader.result as string);
        setCropperType(type);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    if (cropperType === 'avatar') {
      setDraftUser(prev => ({ ...prev, avatar: croppedImage }));
    } else {
      handleProfileSettingChange('coverImage', croppedImage);
    }
    setShowCropper(false);
    setPendingImage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');
    
    try {
      // Basic validation
      if (!draftUser.username) {
          setSaveStatus('error');
          setSaveMessage('Username is required');
          return;
      }

      if (!draftUser.email) {
        setSaveStatus('error');
        setSaveMessage('Email is required');
        return;
      }

      // Ensure birthday is formatted correctly if it was edited
      const userToSave = {
          ...draftUser,
          birthday: draftUser.birthday || undefined
      };
      
      const result = await onUpdateUser(userToSave);
      
      if (result === true || (typeof result === 'object' && (result as any).success)) {
        setSaveStatus('success');
        setSaveMessage(t('settingsSaved') || 'Settings saved successfully');
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setSaveMessage((result as any).error || 'Failed to save settings');
      }
    } catch (error: any) {
        console.error('Save error:', error);
        setSaveStatus('error');
        setSaveMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);
      setPasswordSuccess(null);
      
      if (newPassword !== confirmPassword) {
          setPasswordError(t('passwordsDoNotMatch'));
          return;
      }
      
      if (newPassword.length < 6) {
          setPasswordError(t('passwordTooShort'));
          return;
      }
      
      setIsChangingPassword(true);
      try {
          const response = await apiClient.changePassword(currentPassword, newPassword);
          if (response.error) {
              setPasswordError(response.error);
          } else {
              setPasswordSuccess(t('passwordChangedSuccess'));
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
          }
      } catch (err) {
          setPasswordError('An unexpected error occurred');
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] font-sans">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onViewProfile={(username) => onNavigate(Page.Profile, username)}
        onNavigate={onNavigate}
        onNotificationClick={onNotificationClick}
        allUsers={allUsers}
        allPosts={allPosts}
        conversations={conversations}
        onOpenMarketplace={onOpenMarketplace}
        onSearch={handleSearch}
      />

      <main className="pt-20 pb-20 px-4 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold glitch-text" data-text={t('settings')}>{t('settings')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 border-b border-[var(--theme-border)] mb-6">
            <button 
                onClick={() => setActiveTab('account')}
                className={`px-4 py-2 whitespace-nowrap font-bold transition-all ${activeTab === 'account' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            >
                {t('settingsAccount')}
            </button>
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 whitespace-nowrap font-bold transition-all ${activeTab === 'profile' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            >
                {t('settingsProfile')}
            </button>
            <button 
                onClick={() => setActiveTab('appearance')}
                className={`px-4 py-2 whitespace-nowrap font-bold transition-all ${activeTab === 'appearance' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            >
                {t('settingsAppearance')}
            </button>
            <button 
                onClick={() => setActiveTab('feed')}
                className={`px-4 py-2 whitespace-nowrap font-bold transition-all ${activeTab === 'feed' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            >
                {t('settingsFeed')}
            </button>
        </div>

        <div className="bg-[var(--theme-bg-secondary)]/50 backdrop-blur-md border border-[var(--theme-border)] rounded-lg p-6 shadow-lg">
            
            {/* Account Settings */}
            {activeTab === 'account' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--theme-primary)] mb-4">{t('settingsAccount')}</h2>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('username')}</label>
                            <input
                                type="text"
                                name="username"
                                value={draftUser.username}
                                disabled
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 text-[var(--theme-text-secondary)] cursor-not-allowed"
                            />
                            <p className="text-xs text-[var(--theme-text-secondary)]">Username cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('email')}</label>
                            <input
                                type="email"
                                name="email"
                                value={draftUser.email}
                                onChange={handleInputChange}
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-[var(--theme-border)] pt-6 mt-6">
                        <h3 className="text-lg font-bold">{t('changePassword')}</h3>
                        {passwordError && <div className="text-red-500 text-sm bg-red-900/20 p-2 rounded border border-red-900">{passwordError}</div>}
                        {passwordSuccess && <div className="text-green-500 text-sm bg-green-900/20 p-2 rounded border border-green-900">{passwordSuccess}</div>}
                        
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('currentPassword')}</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none"
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('newPassword')}</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={handleChangePassword}
                                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                className="px-4 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] hover:bg-[var(--theme-border)] transition-colors rounded disabled:opacity-50"
                            >
                                {isChangingPassword ? 'Updating...' : t('updatePassword')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Settings */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--theme-primary)] mb-4">{t('settingsProfile')}</h2>
                    
                    {/* Avatar & Cover */}
                    <div className="space-y-4">
                        <div className="relative h-48 w-full rounded-lg overflow-hidden border border-[var(--theme-border)] group">
                            {draftUser.profileSettings?.coverImage ? (
                                <img src={draftUser.profileSettings.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-purple-900 to-blue-900" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => coverInputRef.current?.click()}
                                    className="bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
                                >
                                    Change Cover
                                </button>
                            </div>
                        </div>

                        <div className="flex items-end gap-4 -mt-12 px-4 relative z-10">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full border-4 border-[var(--theme-bg-primary)] overflow-hidden bg-black">
                                    <img src={draftUser.avatar || 'https://via.placeholder.com/150'} alt={draftUser.username} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                     onClick={() => fileInputRef.current?.click()}>
                                    <span className="text-xs text-white font-bold">EDIT</span>
                                </div>
                            </div>
                            <div className="pb-2">
                                <h3 className="text-xl font-bold">{draftUser.username}</h3>
                                <p className="text-[var(--theme-text-secondary)] text-sm">@{draftUser.username}</p>
                            </div>
                        </div>

                        {/* Preset Covers */}
                        <div className="mt-4">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase block mb-2">Preset Covers</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {COVER_PRESETS.map((url, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleProfileSettingChange('coverImage', url)}
                                        className="w-20 h-12 rounded overflow-hidden border border-[var(--theme-border)] hover:border-[var(--theme-primary)] flex-shrink-0 transition-all"
                                    >
                                        <img src={url} alt={`Preset ${i+1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />
                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('bio')}</label>
                        <textarea
                            name="bio"
                            value={draftUser.bio || ''}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none transition-colors resize-none"
                            placeholder="Tell your story..."
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('location')}</label>
                            <input
                                type="text"
                                name="location"
                                value={draftUser.location || ''}
                                onChange={handleInputChange}
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none"
                                placeholder="Night City"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('website')}</label>
                            <input
                                type="text"
                                name="website"
                                value={draftUser.website || ''}
                                onChange={handleInputChange}
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none"
                                placeholder="https://"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--theme-text-secondary)] font-mono uppercase">{t('birthday')}</label>
                            <input
                                type="date"
                                name="birthday"
                                value={draftUser.birthday || ''}
                                onChange={handleInputChange}
                                className="w-full bg-black/30 border border-[var(--theme-border)] rounded p-2 focus:border-[var(--theme-primary)] focus:outline-none text-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--theme-primary)] mb-4">{t('settingsAppearance')}</h2>
                    
                    <div className="space-y-4">
                         <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)]">
                            <div>
                                <h3 className="font-bold">{t('language')}</h3>
                                <p className="text-sm text-[var(--theme-text-secondary)]">Select your preferred language</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1 rounded border ${language === 'en' ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white' : 'border-[var(--theme-border)] hover:bg-white/10'}`}
                                >
                                    EN
                                </button>
                                <button 
                                    onClick={() => setLanguage('pt')}
                                    className={`px-3 py-1 rounded border ${language === 'pt' ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white' : 'border-[var(--theme-border)] hover:bg-white/10'}`}
                                >
                                    PT
                                </button>
                            </div>
                         </div>

                         <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)]">
                            <div>
                                <h3 className="font-bold">Theme Mode</h3>
                                <p className="text-sm text-[var(--theme-text-secondary)]">Light or Dark mode (Cyberpunk is always dark at heart)</p>
                            </div>
                            <select 
                                value={draftUser.profileSettings?.theme || 'dark'}
                                onChange={(e) => handleProfileSettingChange('theme', e.target.value)}
                                className="bg-black border border-[var(--theme-border)] rounded p-2 text-white"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="system">System</option>
                            </select>
                         </div>

                         <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)]">
                            <div>
                                <h3 className="font-bold">Accent Color</h3>
                                <p className="text-sm text-[var(--theme-text-secondary)]">System-wide highlight color</p>
                            </div>
                            <select 
                                value={draftUser.profileSettings?.accentColor || 'purple'}
                                onChange={(e) => handleProfileSettingChange('accentColor', e.target.value)}
                                className="bg-black border border-[var(--theme-border)] rounded p-2 text-white"
                            >
                                <option value="purple">Neon Purple</option>
                                <option value="blue">Cyber Blue</option>
                                <option value="green">Matrix Green</option>
                                <option value="pink">Hot Pink</option>
                                <option value="yellow">Caution Yellow</option>
                            </select>
                         </div>

                         <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)]">
                            <div>
                                <h3 className="font-bold">Animations</h3>
                                <p className="text-sm text-[var(--theme-text-secondary)]">Enable UI animations and effects</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={draftUser.profileSettings?.animationsEnabled ?? true}
                                    onChange={(e) => handleProfileSettingChange('animationsEnabled', e.target.checked)}
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                            </label>
                         </div>
                    </div>
                </div>
            )}

            {/* Feed Settings */}
            {activeTab === 'feed' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--theme-primary)] mb-4">{t('settingsFeed')}</h2>
                    
                    <div className="space-y-4">
                         <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)]">
                            <div>
                                <h3 className="font-bold">{t('settingsAutoRefresh')}</h3>
                                <p className="text-sm text-[var(--theme-text-secondary)]">{t('settingsAutoRefreshDesc')}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={draftUser.profileSettings?.autoRefreshEnabled ?? false}
                                    onChange={(e) => handleProfileSettingChange('autoRefreshEnabled', e.target.checked)}
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                            </label>
                         </div>

                         {draftUser.profileSettings?.autoRefreshEnabled && (
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded border border-[var(--theme-border)] animate-fade-in">
                                <div>
                                    <h3 className="font-bold">{t('settingsRefreshInterval')}</h3>
                                    <p className="text-sm text-[var(--theme-text-secondary)]">Minutes between updates</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={draftUser.profileSettings?.autoRefreshInterval || 5}
                                        onChange={(e) => handleProfileSettingChange('autoRefreshInterval', Math.max(1, parseInt(e.target.value) || 1))}
                                        className="bg-black border border-[var(--theme-border)] rounded p-2 text-white w-20 text-center"
                                    />
                                    <span className="text-[var(--theme-text-secondary)]">min</span>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col items-end pt-6">
            {saveStatus === 'success' && (
                <div className="mb-4 p-3 bg-green-900/50 border border-green-500 text-green-200 rounded animate-fade-in flex items-center">
                    <span className="mr-2">✓</span> {saveMessage}
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded animate-fade-in flex items-center">
                    <span className="mr-2">⚠</span> {saveMessage}
                </div>
            )}
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`bg-[var(--theme-primary)] text-white px-8 py-3 rounded-md font-bold hover:brightness-110 transition-all shadow-[0_0_15px_var(--theme-primary)] ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isSaving ? 'SAVING...' : t('saveChanges')}
            </button>
        </div>

      </main>
      
      {showCropper && pendingImage && (
          <ImageCropper 
              imageSrc={pendingImage}
              aspectRatio={cropperType === 'avatar' ? 1 : 3}
              onCrop={handleCropComplete}
              onCancel={() => { setShowCropper(false); setPendingImage(null); }}
          />
      )}
    </div>
  );
}
