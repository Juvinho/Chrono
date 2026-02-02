import React, { useState, useRef, useEffect } from 'react';
import { User, Page, Post, ProfileSettings, Notification, Conversation, Item } from '../types';
import Header from './Header';
import { Avatar } from './Avatar';
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

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, onNavigate, onNotificationClick, onUpdateUser, allUsers, allPosts, conversations, onOpenMarketplace }) => {
  const { t, setLanguage, language } = useTranslation();

  // FIX: Safely initialize draftUser state to ensure profileSettings always exists.
  // This prevents crashes when updating settings for users who don't have a profileSettings object yet.
  const [draftUser, setDraftUser] = useState<User>(() => ({
    ...user,
    // Ensure birthday is in YYYY-MM-DD format for the date input
    birthday: user.birthday ? (user.birthday.includes('T') ? user.birthday.split('T')[0] : user.birthday) : '',
    profileSettings: {
        ...defaultSettings,
        coverImage: user.coverImage, // Use the base coverImage as default
        ...user.profileSettings, // Override with any existing settings
    },
  }));

  const [saved, setSaved] = useState(false);
  const [blockUsername, setBlockUsername] = useState('');
  const [passcode, setPasscode] = useState({ current: '', new: ''});
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showCoverGallery, setShowCoverGallery] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
        setLoadingInventory(true);
        const { data } = await apiClient.getUserInventory();
        if (data) {
            setInventory(data);
        }
        setLoadingInventory(false);
    };
    fetchInventory();
  }, []);

  const handleEquipToggle = async (item: Item) => {
      // Optimistic update
      const isEquipped = (item.type === 'frame' && draftUser.equippedFrame?.id === item.id) || 
                         (item.type === 'effect' && draftUser.equippedEffect?.id === item.id);
      
      let updatedUser = { ...draftUser };
      
      try {
          if (isEquipped) {
              // Unequip
              if (item.type === 'frame') updatedUser.equippedFrame = undefined;
              if (item.type === 'effect') updatedUser.equippedEffect = undefined;
              await apiClient.unequipItem(item.id);
          } else {
              // Equip
              if (item.type === 'frame') updatedUser.equippedFrame = item;
              if (item.type === 'effect') updatedUser.equippedEffect = item;
              await apiClient.equipItem(item.id);
          }
          
          setDraftUser(updatedUser);
          // Notify parent of the update so Header and other components update immediately
          onUpdateUser(updatedUser);
      } catch (error) {
          console.error("Failed to toggle equip item:", error);
          // Revert on error would be ideal, but for now just logging
      }
  };

  // Image Cropping State
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [croppingField, setCroppingField] = useState<'avatar' | 'coverImage' | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };
  
  const handleSave = async () => {
      // Check for large payload
      if (draftUser.avatar && draftUser.avatar.length > 5 * 1024 * 1024 * 1.33) {
        setErrorMsg(t('settingsImageTooLarge') || "Image too large. Please crop it smaller or choose a different image.");
        return;
      }

      const result = await onUpdateUser(draftUser);
      const success = typeof result === 'object' ? result.success : result;
      const resultError = typeof result === 'object' ? result.error : undefined;

      if (success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
      } else {
          setErrorMsg(resultError || t('settingsSaveError') || "Failed to save settings. Please try again.");
      }
  };
  
  const handlePasscodeUpdate = () => {
    setErrorMsg(null);
    if (passcode.current === user.password) {
        if(passcode.new.length < 6) {
            setErrorMsg(t('settingsPasswordTooShort') || "Password must be at least 6 characters.");
            return;
        }
        onUpdateUser({...draftUser, password: passcode.new});
        setPasscode({current: '', new: ''});
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    } else {
        setErrorMsg(t('settingsPasswordIncorrect') || "Incorrect current password.");
    }
  }
  
  const handleBlockUser = () => {
    if (!blockUsername || draftUser.blockedUsers?.includes(blockUsername) || blockUsername === user.username) return;
    const updatedBlocked = [...(draftUser.blockedUsers || []), blockUsername];
    setDraftUser(prev => ({...prev, blockedUsers: updatedBlocked}));
    setBlockUsername('');
  }
  
  const handleUnblockUser = (username: string) => {
      const updatedBlocked = draftUser.blockedUsers?.filter(u => u !== username);
      setDraftUser(prev => ({...prev, blockedUsers: updatedBlocked}));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'avatar') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCroppingImage(reader.result as string);
        setCroppingField(field);
        
        // Reset file input so the same file can be selected again if cancelled
        if (field === 'avatar' && avatarInputRef.current) avatarInputRef.current.value = '';
        if (field === 'coverImage' && coverInputRef.current) coverInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    if (croppingField === 'coverImage') {
        // FIX: Safely update profileSettings
        setDraftUser(prev => ({ 
            ...prev, 
            // Also update root property for compatibility
            coverImage: croppedImage,
            profileSettings: { 
                ...(prev.profileSettings as ProfileSettings), 
                coverImage: croppedImage 
            } 
        }));
    } else if (croppingField === 'avatar') {
        setDraftUser(prev => ({ ...prev, avatar: croppedImage }));
    }
    
    // Close cropper
    setCroppingImage(null);
    setCroppingField(null);
  };

  const handleCropCancel = () => {
    setCroppingImage(null);
    setCroppingField(null);
  };
  
  const handleProfileSettingChange = (key: keyof ProfileSettings, value: any) => {
      // FIX: Safely update profileSettings
      const updatedUser = {
          ...draftUser,
          profileSettings: {
              ...(draftUser.profileSettings as ProfileSettings),
              [key]: value,
          }
      };
      
      setDraftUser(updatedUser);
      
      // Apply theme immediately for preview (without saving)
      if (key === 'theme' || key === 'accentColor' || key === 'effect' || key === 'animationsEnabled') {
          // Update current user immediately for theme preview
          const tempUser = { ...user, profileSettings: updatedUser.profileSettings };
          onUpdateUser(tempUser);
      }
  };

  const accentColors: ProfileSettings['accentColor'][] = ['purple', 'green', 'amber', 'red', 'blue'];

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onViewProfile={(username) => onNavigate(Page.Profile, username)} 
        onNavigate={onNavigate}
        onNotificationClick={onNotificationClick}
        onSearch={handleSearch} 
        allPosts={allPosts} 
        allUsers={allUsers}
        conversations={conversations}
        onOpenMarketplace={onOpenMarketplace}
      />
      <main className="flex-grow overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--theme-text-light)] mb-2 glitch-effect" data-text={t('settingsTitle')}>{t('settingsTitle')}</h1>
              <p className="text-[var(--theme-text-secondary)]">{t('settingsSubtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
                 {saved && <span className="text-[var(--theme-primary)] font-bold animate-pulse uppercase tracking-widest">{t('settingsSaved')}</span>}
                 {errorMsg && <span className="text-red-500 font-bold animate-pulse">{errorMsg}</span>}
                 <button onClick={handleSave} className={`px-6 py-2 rounded-sm font-bold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-secondary)]'}`}>
                    {saved ? t('settingsSaved') : t('settingsSaveChanges')}
                </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Profile Management */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
              <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-4 pb-2 border-b-2 border-[var(--theme-border-primary)]">:: {t('settingsProfileManagement')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsAvatar')}</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16">
                    {(() => {
                        const avatarShape = draftUser.equippedFrame ? getFrameShape(draftUser.equippedFrame.name) : 'rounded-full';
                        return (
                            <>
                                <Avatar src={draftUser.avatar} username={draftUser.username} className={`w-full h-full ${avatarShape} object-cover`} />
                                {draftUser.equippedEffect && (
                                    <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                      <img 
                                        src={draftUser.equippedEffect.imageUrl} 
                                        alt="" 
                                        className="w-full h-full object-cover animate-pulse-soft"
                                      />
                                    </div>
                                )}
                                {draftUser.equippedFrame && (
                                    <div className="absolute -inset-1 z-20 pointer-events-none">
                                      <FramePreview item={draftUser.equippedFrame} />
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    </div>
                    <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                    <button onClick={() => avatarInputRef.current?.click()} className="follow-btn px-4 py-1 text-sm">{t('settingsUpload')}</button>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                   <div className="flex justify-between items-center">
                       <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsCoverImage')}</label>
                       <button 
                           onClick={() => setShowCoverGallery(!showCoverGallery)} 
                           className="text-xs text-[var(--theme-primary)] hover:underline"
                       >
                           {showCoverGallery ? (t('settingsHideGallery') || "Hide Gallery") : (t('settingsShowGallery') || "Choose from Gallery")}
                       </button>
                   </div>
                   
                   {showCoverGallery && (
                       <div className="grid grid-cols-3 gap-2 mb-2 animate-[fadeIn_0.2s_ease-out]">
                           {COVER_PRESETS.map((url, idx) => (
                               <button 
                                   key={idx}
                                   onClick={() => {
                                       setDraftUser(prev => ({ 
                                           ...prev, 
                                           coverImage: url,
                                           profileSettings: { 
                                               ...(prev.profileSettings as ProfileSettings), 
                                               coverImage: url 
                                           } 
                                       }));
                                       setShowCoverGallery(false);
                                   }}
                                   className="h-12 w-full rounded overflow-hidden border border-transparent hover:border-[var(--theme-primary)] transition-all"
                               >
                                   <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                               </button>
                           ))}
                       </div>
                   )}

                   <div className="w-32 h-16 rounded-sm border border-[var(--theme-border-primary)] overflow-hidden relative">
                     <Avatar 
                       src={draftUser.coverImage || draftUser.profileSettings.coverImage || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80'} 
                       username={draftUser.username}
                       className="w-full h-full object-cover"
                     />
                   </div>
                     <input type="file" accept="image/*" ref={coverInputRef} onChange={(e) => handleFileChange(e, 'coverImage')} className="hidden" />
                     <button onClick={() => coverInputRef.current?.click()} className="follow-btn px-4 py-1 text-sm">{t('settingsUpload')}</button>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsBio')}</label>
                  <textarea value={draftUser.bio} onChange={(e) => setDraftUser({...draftUser, bio: e.target.value})} rows={3} className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                </div>
                 <div className="space-y-1">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsPronouns')}</label>
                  <input type="text" placeholder={t('settingsPronounsPlaceholder')} value={draftUser.pronouns || ''} onChange={(e) => setDraftUser({...draftUser, pronouns: e.target.value})} className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                </div>
                 <div className="space-y-1">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsBirthday') || 'Birthday'}</label>
                  <input type="date" value={draftUser.birthday} onChange={(e) => setDraftUser({...draftUser, birthday: e.target.value})} className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsLocation') || 'Location'}</label>
                  <input type="text" placeholder={t('settingsLocation') || "City, Country"} value={draftUser.location || ''} onChange={(e) => setDraftUser({...draftUser, location: e.target.value})} className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsWebsite') || 'Website'}</label>
                  <input type="url" placeholder="https://example.com" value={draftUser.website || ''} onChange={(e) => setDraftUser({...draftUser, website: e.target.value})} className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                </div>
              </div>
            </section>

            {/* Inventory / Wardrobe */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
              <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-4 pb-2 border-b-2 border-[var(--theme-border-primary)]">:: {t('settingsWardrobe') || "Inventário / Wardrobe"}</h2>
              
              {loadingInventory ? (
                  <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                  </div>
              ) : inventory.length === 0 ? (
                  <div className="text-center p-8 text-[var(--theme-text-secondary)]">
                      <p>{t('settingsNoItems') || "Você ainda não possui itens."}</p>
                      <button 
                          onClick={onOpenMarketplace}
                          className="mt-4 px-4 py-2 bg-[var(--theme-primary)] text-white rounded hover:bg-[var(--theme-secondary)] transition-colors"
                      >
                          {t('settingsGoToMarketplace') || "Ir para o Mercado"}
                      </button>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {inventory.map(item => {
                          const isEquipped = (item.type === 'frame' && draftUser.equippedFrame?.id === item.id) || 
                                             (item.type === 'effect' && draftUser.equippedEffect?.id === item.id);
                          return (
                              <div 
                                  key={item.id} 
                                  onClick={() => handleEquipToggle(item)}
                                  className={`relative group cursor-pointer border rounded-lg overflow-hidden transition-all ${
                                      isEquipped 
                                          ? 'border-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] shadow-[0_0_10px_var(--theme-primary)]' 
                                          : 'border-[var(--theme-border-primary)] hover:border-[var(--theme-text-secondary)]'
                                  }`}
                              >
                                  <div className="aspect-square relative p-4 flex items-center justify-center bg-[var(--theme-bg-primary)]">
                                      {/* Avatar Preview Background for Context */}
                                      <div className="w-16 h-16 rounded-full overflow-hidden relative opacity-50 grayscale group-hover:grayscale-0 transition-all">
                                          <Avatar src={draftUser.avatar} username={draftUser.username} className="w-full h-full object-cover" />
                                      </div>
                                      
                                      {/* Item Preview */}
                                      {item.type === 'frame' ? (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <div className="w-20 h-20 relative">
                                                  <FramePreview item={item} />
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-80 flex items-center justify-center">
                                               <div className="w-16 h-16 rounded-full overflow-hidden relative">
                                                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover animate-pulse-soft" />
                                               </div>
                                          </div>
                                      )}

                                      {isEquipped && (
                                          <div className="absolute top-2 right-2 bg-[var(--theme-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                              Equipped
                                          </div>
                                      )}
                                  </div>
                                  <div className="p-2 text-center">
                                      <h3 className="text-xs font-bold text-[var(--theme-text-light)] truncate">{item.name}</h3>
                                      <p className="text-[10px] text-[var(--theme-text-secondary)] uppercase">{item.type}</p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
            </section>

            {/* Appearance Customization */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
              <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-4 pb-2 border-b-2 border-[var(--theme-border-primary)]">:: {t('settingsAppearance')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] mb-2">{t('settingsTheme')}</h3>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => handleProfileSettingChange('theme', 'dark')} 
                            className={`px-4 py-2 border transition-colors ${
                                draftUser.profileSettings.theme === 'dark' 
                                    ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' 
                                    : 'border-[var(--theme-border-primary)] text-[var(--theme-text-primary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'
                            }`}
                        >
                            {t('settingsThemeDark')}
                        </button>
                        <button 
                            onClick={() => handleProfileSettingChange('theme', 'light')} 
                            className={`px-4 py-2 border transition-colors ${
                                draftUser.profileSettings.theme === 'light' 
                                    ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' 
                                    : 'border-[var(--theme-border-primary)] text-[var(--theme-text-primary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'
                            }`}
                        >
                            {t('settingsThemeLight')}
                        </button>
                    </div>
                </div>
                 <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] mb-2">{t('settingsLanguage')}</h3>
                    <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'pt')} className="language-selector">
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                    </select>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] mb-2">{t('settingsAccentColor')}</h3>
                    <div className="flex space-x-2">
                        {accentColors.map(color => (
                            <button key={color} onClick={() => handleProfileSettingChange('accentColor', color)} className={`w-8 h-8 rounded-full border-2 ${draftUser.profileSettings.accentColor === color ? 'border-[var(--theme-secondary)]' : 'border-transparent'}`}>
                                <div className={`w-full h-full rounded-full accent-${color} bg-[var(--theme-primary)]`}></div>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] mb-2">{t('settingsVisualEffects')}</h3>
                    <select value={draftUser.profileSettings.effect} onChange={(e) => handleProfileSettingChange('effect', e.target.value)} className="px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]">
                        <option value="none">{t('settingsEffectNone')}</option>
                        <option value="scanline">{t('settingsEffectScanline')}</option>
                        <option value="glitch_overlay">{t('settingsEffectGlitchOverlay')}</option>
                    </select>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] mb-2">{t('settingsBorderRadius')}</h3>
                    <div className="flex space-x-2">
                        {(['none', 'sm', 'md', 'full'] as const).map(radius => (
                            <button 
                                key={radius}
                                onClick={() => handleProfileSettingChange('borderRadius', radius)}
                                className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${
                                    (draftUser.profileSettings.borderRadius || 'md') === radius 
                                    ? 'border-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)]' 
                                    : 'border-[var(--theme-border-primary)] hover:border-[var(--theme-secondary)]'
                                }`}
                                title={radius}
                            >
                                <div className={`w-6 h-6 bg-[var(--theme-text-secondary)] ${
                                    radius === 'none' ? 'rounded-none' : 
                                    radius === 'sm' ? 'rounded-sm' : 
                                    radius === 'md' ? 'rounded-md' : 
                                    'rounded-full'
                                }`}></div>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-[var(--theme-border-secondary)]">
                    <div>
                        <h3 className="text-[var(--theme-text-light)]">{t('settingsAnimationsEnable')}</h3>
                        <p className="text-sm text-[var(--theme-text-secondary)]">{t('settingsAnimationsDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={draftUser.profileSettings.animationsEnabled ?? true} onChange={(e) => handleProfileSettingChange('animationsEnabled', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--theme-secondary)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                    </label>
                </div>
              </div>
            </section>

            {/* Account & Safety */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
              <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-4 pb-2 border-b-2 border-[var(--theme-border-primary)]">:: {t('settingsAccountSafety')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('settingsChangePasscode')}</label>
                  <input type="password" value={passcode.current} onChange={e => setPasscode(p => ({...p, current: e.target.value}))} placeholder={t('settingsCurrentPasscode')} className="w-full max-w-sm mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                  <input type="password" value={passcode.new} onChange={e => setPasscode(p => ({...p, new: e.target.value}))} placeholder={t('settingsNewPasscode')} className="w-full max-w-sm mt-2 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
                   <button onClick={handlePasscodeUpdate} className="follow-btn px-4 py-1 text-sm mt-2">{t('settingsUpdatePasscode')}</button>
                </div>
                
                 <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border-secondary)]">
                    <div>
                        <h3 className="text-[var(--theme-text-light)]">{t('settingsPrivateProfile')}</h3>
                        <p className="text-sm text-[var(--theme-text-secondary)]">{t('settingsPrivateProfileDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={draftUser.isPrivate} onChange={(e) => setDraftUser({...draftUser, isPrivate: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--theme-secondary)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                    </label>
                </div>
                 <div className="pt-4 border-t border-[var(--theme-border-secondary)]">
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)] block mb-2">{t('settingsBlockedUsers')}</h3>
                    <div className="flex space-x-2">
                        <input type="text" value={blockUsername} onChange={e => setBlockUsername(e.target.value)} placeholder={t('usernamePlaceholder')} className="flex-grow px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"/>
                        <button onClick={handleBlockUser} className="follow-btn px-4 py-1">{t('settingsBlock')}</button>
                    </div>
                    <div className="mt-2 space-y-1">
                        {draftUser.blockedUsers?.map(username => (
                            <div key={username} className="flex justify-between items-center bg-[var(--theme-bg-tertiary)] p-2">
                                <span>@{username}</span>
                                <button onClick={() => handleUnblockUser(username)} className="text-xs text-red-500 hover:underline">{t('settingsUnblock')}</button>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center space-x-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)] cursor-pointer pt-4 border-t border-[var(--theme-border-secondary)]">
                    <FlagIcon className="w-5 h-5" />
                    <span>{t('settingsReportingPolicy')}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {croppingImage && (
        <ImageCropper 
          imageSrc={croppingImage}
          aspectRatio={croppingField === 'avatar' ? 1 : 3} // Avatar 1:1, Cover ~3:1
          isCircular={croppingField === 'avatar'}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default SettingsPage;