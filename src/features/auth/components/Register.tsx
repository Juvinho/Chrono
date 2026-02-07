

import React, { useState, useRef, useEffect } from 'react';
import GlitchText from '../../../components/ui/GlitchText';
import { User, Page, ProfileSettings } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserIcon } from '../../../components/ui/icons';
import { apiClient, mapApiUserToUser } from '../../../api';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';
import { generateInitialsAvatar } from '../../../utils/avatarGenerator';
import { validateNoEmojis } from '../../../utils/emojiValidation';

interface RegisterProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onNavigate: (page: Page, email?: string) => void;
  onLogin: (user: User) => void;
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
    const [avatar, setAvatar] = useState('');
    const [error, setError] = useState('');
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isCustomAvatar, setIsCustomAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Mock initial frame for preview (optional, or null if new users start with no frame)
    // For now, we assume new users have no frame, but we use the helper to be safe/consistent
    const avatarShape = 'rounded-full'; // Default for new users without frame

    // Generate avatar from initials if not custom
    useEffect(() => {
        if (username && !isCustomAvatar) {
            const generated = generateInitialsAvatar(username);
            setAvatar(generated);
        }
    }, [username, isCustomAvatar]);

    useEffect(() => {
        const checkUsername = async () => {
            if (username.length < 3) {
                if (username.length > 0) setUsernameError(t('errorUsernameTooShort'));
                return;
            }

            const emojiValidation = validateNoEmojis(username, t('registerUsername'));
            if (!emojiValidation.valid) {
                setUsernameError(emojiValidation.error);
                return;
            }

            setIsCheckingUsername(true);
            setUsernameError('');
            setUsernameSuggestions([]);
            
            try {
                const response = await apiClient.checkUsername(username);
                if (response.data && !response.data.available) {
                    setUsernameError(response.data.error || 'Nome de usuário indisponível');
                    if (response.data.suggestions) {
                        setUsernameSuggestions(response.data.suggestions);
                    }
                } else if (response.error) {
                     setUsernameError(response.error);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (username) checkUsername();
            else {
                setUsernameError('');
                setUsernameSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [username]);

    useEffect(() => {
        const checkEmail = async () => {
            if (!email) {
                setEmailError('');
                return;
            }
            // Basic regex for quick check before API to reduce load
            // RFC 5322 simplified for common emails
            if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email)) {
                setEmailError(t('errorInvalidEmail') || 'Invalid email format.');
                return;
            }

            setIsCheckingEmail(true);
            setEmailError('');
            
            try {
                const response = await apiClient.checkEmail(email);
                if (response.data && !response.data.valid) {
                    setEmailError(response.data.error || t('errorEmailInvalid') || 'Invalid email');
                } else if (response.error) {
                    setEmailError(response.error);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsCheckingEmail(false);
            }
        };

        const timeoutId = setTimeout(() => {
            checkEmail();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [email]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
            setAvatar(reader.result as string);
            setIsCustomAvatar(true);
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (emailError || usernameError || isCheckingEmail || isCheckingUsername) {
            setError(t('errorFixErrors'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('errorPasswordMatch'));
            return;
        }
        if (password.length < 6) {
            setError(t('errorPasswordShort'));
            return;
        }

        if (username.includes(' ')) {
            setError(t('errorUsernameSpaces'));
            return;
        }

        if (!captchaVerified) {
            setError(t('errorCaptchaRequired'));
            return;
        }

        try {
            const response = await apiClient.register({ 
                username, 
                email, 
                password, 
                avatar: avatar || undefined, 
                captchaVerified 
            });
            
            if (response.error) {
                setError(response.error);
                return;
            }

            // Navigate to verify page with email
            onNavigate(Page.Verify, email);
            
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
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={`w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border ${emailError ? 'border-red-500' : 'border-[var(--theme-border-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]`} />
                        {isCheckingEmail && <p className="text-xs text-[var(--theme-text-secondary)] mt-1 animate-pulse">{t('verifyingAvailability')}</p>}
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                        {!emailError && !isCheckingEmail && email && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email) && <p className="text-xs text-green-500 mt-1">{t('emailValid')}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerUsername')}</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={`w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border ${usernameError ? 'border-red-500' : 'border-[var(--theme-border-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]`} />
                         {isCheckingUsername && <p className="text-xs text-[var(--theme-text-secondary)] mt-1 animate-pulse">{t('verifyingAvailability')}</p>}
                        {usernameError && (
                            <div className="mt-1">
                                <p className="text-xs text-red-500">{usernameError}</p>
                                {usernameSuggestions.length > 0 && (
                                    <div className="mt-2 p-2 bg-[var(--theme-bg-secondary)] rounded border border-[var(--theme-border-primary)]">
                                        <p className="text-xs text-[var(--theme-text-secondary)] mb-1">{t('usernameSuggestions')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {usernameSuggestions.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setUsername(s)}
                                                    className="text-xs px-2 py-1 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded hover:border-[var(--theme-primary)] transition-colors text-[var(--theme-primary)]"
                                                >
                                                    @{s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!usernameError && !isCheckingUsername && username.length >= 3 && <p className="text-xs text-green-500 mt-1">{t('usernameAvailable')}</p>}
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
                            {t('captchaIAmNotARobot')}
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