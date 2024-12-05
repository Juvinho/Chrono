

import React, { useState, useRef } from 'react';
import GlitchText from './GlitchText';
import { User, Page, ProfileSettings } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { UserIcon } from './icons';
import { apiClient, mapApiUserToUser } from '../services/api';
import FramePreview, { getFrameShape } from './FramePreview';

interface RegisterProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onNavigate: (page: Page, email?: string) => void;
}

const defaultSettings: ProfileSettings = {
    theme: 'light',
    accentColor: 'purple',
    effect: 'none',
    coverImage: `https://picsum.photos/seed/${Date.now()}_cover/1200/400`,
    animationsEnabled: true,
};

export default function Register({ users, setUsers, onNavigate, onLogin }: RegisterProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop');
    const [error, setError] = useState('');
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Mock initial frame for preview (optional, or null if new users start with no frame)
    // For now, we assume new users have no frame, but we use the helper to be safe/consistent
    const avatarShape = 'rounded-full'; // Default for new users without frame

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
            setAvatar(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('errorPasswordMatch'));
            return;
        }
        if (password.length < 6) {
            setError(t('errorPasswordShort'));
            return;
        }

        if (username.includes(' ')) {
            setError('O nome de usuário não pode conter espaços.');
            return;
        }

        if (!captchaVerified) {
            setError('Por favor, confirme que você não é um robô');
            return;
        }

        try {
            const response = await apiClient.register(username, email, password, avatar || undefined, captchaVerified);
            
            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.data?.token && response.data?.user) {
                apiClient.setToken(response.data.token);
                const user = mapApiUserToUser(response.data.user);
                onLogin(user);
                onNavigate(Page.Dashboard);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar. Tente novamente.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <div className="text-center">
                    <GlitchText text={t('registerTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">{t('registerSubtitle')}</p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerEmail')}</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerUsername')}</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                     <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerAvatar')}</label>
                        <div className="mt-1 flex items-center space-x-4">
                            <div className={`w-16 h-16 ${avatarShape} bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] flex items-center justify-center overflow-hidden`}>
                                {avatar ? (
                                    <img src={avatar} alt={t('registerAvatar')} className={`w-full h-full ${avatarShape} object-cover`}/>
                                ) : (
                                    <UserIcon className="w-8 h-8 text-[var(--theme-text-secondary)]" />
                                )}
                            </div>
                            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleFileChange} className="hidden" />
                            <button type="button" onClick={() => avatarInputRef.current?.click()} className="follow-btn px-4 py-1 text-sm">
                                {t('registerUploadAvatar')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerPassword')}</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerConfirmPass')}</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    
                    <div className="flex items-center space-x-2 p-3 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]">
                        <input
                            type="checkbox"
                            id="captcha-register"
                            checked={captchaVerified}
                            onChange={(e) => setCaptchaVerified(e.target.checked)}
                            className="w-5 h-5 cursor-pointer accent-[var(--theme-primary)]"
                        />
                        <label htmlFor="captcha-register" className="text-sm text-[var(--theme-text-primary)] cursor-pointer flex-1">
                            Eu não sou um robô
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        disabled={!captchaVerified}
                        className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        [ {t('registerButton')} ]
                    </button>
                </form>
                 <div className="text-center text-sm">
                    <span className="text-[var(--theme-text-secondary)]">{t('registerHasAccount')} </span>
                    <button onClick={() => onNavigate(Page.Login)} className="font-bold text-[var(--theme-primary)] hover:underline">
                        {t('registerLoginNow')}
                    </button>
                </div>
            </div>
        </div>
    );
}