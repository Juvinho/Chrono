

import React, { useState, useRef, useEffect } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import GlitchText from '../../../components/ui/GlitchText';
import { User, Page, ProfileSettings } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserIcon } from '../../../components/ui/icons';
import { apiClient, mapApiUserToUser } from '../../../api';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';
import { generateInitialsAvatar } from '../../../utils/avatarGenerator';
import { validateNoEmojis } from '../../../utils/emojiValidation';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PasswordInput } from './PasswordInput';
import { useFormNavigation } from '../../../hooks/useFormNavigation';

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
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaError, setCaptchaError] = useState('');
    const captchaRef = useRef<HCaptcha>(null);
    const [emailError, setEmailError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isCustomAvatar, setIsCustomAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const latestUsernameCheckRef = useRef(0);
    const latestEmailCheckRef = useRef(0);

    // Form navigation refs (for Enter key navigation)
    const emailRef = useRef<HTMLInputElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    // Mock initial frame for preview (optional, or null if new users start with no frame)
    // For now, we assume new users have no frame, but we use the helper to be safe/consistent
    const avatarShape = 'rounded-full'; // Default for new users without frame

    const formatRetryAfterMessage = (retryAfterMs?: number) => {
        const retryMs = typeof retryAfterMs === 'number' ? retryAfterMs : 0;
        const totalSeconds = Math.max(1, Math.ceil(retryMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes > 0) {
            return `Muitas tentativas. Aguarde ${minutes}m ${seconds}s para tentar novamente.`;
        }

        return `Muitas tentativas. Aguarde ${seconds}s para tentar novamente.`;
    };

    // Generate avatar from initials if not custom
    useEffect(() => {
        if (username && !isCustomAvatar) {
            const generated = generateInitialsAvatar(username);
            setAvatar(generated);
        }
    }, [username, isCustomAvatar]);

    // Form navigation: Allow Enter key to move between fields
    useFormNavigation(
        {
            fields: [
                { current: emailRef.current, id: 'email' },
                { current: usernameRef.current, id: 'username' },
                { current: passwordRef.current, id: 'password' },
                { current: confirmPasswordRef.current, id: 'confirmPassword' },
            ],
            onSubmit: () => {
                // On Enter in confirm password field, focus captcha or submit
                const captchaElement = document.querySelector('[class*="hcaptcha"]');
                if (captchaElement) {
                    (captchaElement as HTMLElement).focus();
                } else {
                    const form = document.querySelector('form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { bubbles: true }));
                    }
                }
            },
            submitOnLastField: false,
        }
    );

    useEffect(() => {
        const checkUsername = async () => {
            const normalizedUsername = username.trim();

            if (normalizedUsername.length < 3) {
                if (normalizedUsername.length > 0) setUsernameError(t('errorUsernameTooShort'));
                return;
            }

            const emojiValidation = validateNoEmojis(normalizedUsername, t('registerUsername'));
            if (!emojiValidation.valid) {
                setUsernameError(emojiValidation.error);
                return;
            }

            const checkId = ++latestUsernameCheckRef.current;

            setIsCheckingUsername(true);
            setUsernameError('');
            setUsernameSuggestions([]);
            
            try {
                const response = await apiClient.checkUsername(normalizedUsername);
                if (checkId !== latestUsernameCheckRef.current) {
                    return;
                }

                if (response.data && !response.data.available) {
                    setUsernameError(response.data.error || 'Nome de usuário indisponível');
                    if (response.data.suggestions) {
                        setUsernameSuggestions(response.data.suggestions);
                    }
                } else if (response.error) {
                    if (response.error === 'rateLimitError') {
                        setUsernameError(formatRetryAfterMessage(response.retryAfter));
                    } else {
                        setUsernameError(response.error);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (checkId === latestUsernameCheckRef.current) {
                    setIsCheckingUsername(false);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            if (username.trim()) checkUsername();
            else {
                latestUsernameCheckRef.current += 1;
                setUsernameError('');
                setUsernameSuggestions([]);
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [username]);

    useEffect(() => {
        const checkEmail = async () => {
            const normalizedEmail = email.trim().toLowerCase();

            if (!normalizedEmail) {
                latestEmailCheckRef.current += 1;
                setEmailError('');
                return;
            }

            // Basic regex for quick check before API to reduce load
            // RFC 5322 simplified for common emails
            if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(normalizedEmail)) {
                setEmailError(t('errorInvalidEmail') || 'Invalid email format.');
                return;
            }

            const checkId = ++latestEmailCheckRef.current;

            setIsCheckingEmail(true);
            setEmailError('');
            
            try {
                const response = await apiClient.checkEmail(normalizedEmail);
                if (checkId !== latestEmailCheckRef.current) {
                    return;
                }

                if (response.data && !response.data.valid) {
                    setEmailError(response.data.error || t('errorEmailInvalid') || 'Invalid email');
                } else if (response.error) {
                    if (response.error === 'rateLimitError') {
                        setEmailError(formatRetryAfterMessage(response.retryAfter));
                    } else {
                        setEmailError(response.error);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (checkId === latestEmailCheckRef.current) {
                    setIsCheckingEmail(false);
                }
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

        if (!captchaToken) {
            setCaptchaError('Please complete the captcha verification.');
            return;
        }

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        setIsCheckingUsername(true);
        setIsCheckingEmail(true);

        try {
            const [usernameCheck, emailCheck] = await Promise.all([
                apiClient.checkUsername(normalizedUsername),
                apiClient.checkEmail(normalizedEmail),
            ]);

            if (usernameCheck.error) {
                setError(
                    usernameCheck.error === 'rateLimitError'
                        ? formatRetryAfterMessage(usernameCheck.retryAfter)
                        : usernameCheck.error
                );
                return;
            }

            if (!usernameCheck.data?.available) {
                setUsernameError(usernameCheck.data?.error || 'Nome de usuário indisponível');
                setUsernameSuggestions(usernameCheck.data?.suggestions || []);
                setError('Este nome de usuário já está em uso. Escolha outro para continuar.');
                return;
            }

            if (emailCheck.error) {
                setError(
                    emailCheck.error === 'rateLimitError'
                        ? formatRetryAfterMessage(emailCheck.retryAfter)
                        : emailCheck.error
                );
                return;
            }

            if (!emailCheck.data?.valid) {
                setEmailError(emailCheck.data?.error || 'Email inválido');
                setError('Este email não pode ser usado. Corrija para continuar.');
                return;
            }

            setUsernameError('');
            setEmailError('');
        } finally {
            setIsCheckingUsername(false);
            setIsCheckingEmail(false);
        }

        try {
            const response = await apiClient.register({ 
                username: normalizedUsername, 
                email: normalizedEmail,
                password, 
                avatar: avatar || undefined, 
                captchaToken
            });
            
            if (response.error) {
                if (response.error === 'rateLimitError') {
                    setError(formatRetryAfterMessage(response.retryAfter));
                    return;
                }

                const errorData = (response.errorData || {}) as { field?: string; details?: string[]; errorCode?: string };

                if (response.status === 409) {
                    if (errorData.field === 'username') {
                        setUsernameError(response.error);
                    }
                    if (errorData.field === 'email') {
                        setEmailError(response.error);
                    }
                }

                if (response.error.toLowerCase().includes('hcaptcha')) {
                    const details = (errorData.details || []) as string[];
                    const errorCode = String(errorData.errorCode || '');
                    setCaptchaToken(null);
                    captchaRef.current?.resetCaptcha();
                    if (errorCode === 'hcaptcha_server_misconfigured') {
                        setCaptchaError('Captcha indisponível por configuração do servidor. Tente novamente em instantes.');
                    } else if (details.length > 0) {
                        setCaptchaError(`Captcha inválido (${details.join(', ')}). Complete o captcha novamente.`);
                    } else {
                        setCaptchaError('Captcha inválido/expirado. Complete o captcha novamente.');
                    }
                }
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
                        <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={`w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border ${emailError ? 'border-red-500' : 'border-[var(--theme-border-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]`} />
                        {isCheckingEmail && <p className="text-xs text-[var(--theme-text-secondary)] mt-1 animate-pulse">{t('verifyingAvailability')}</p>}
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                        {!emailError && !isCheckingEmail && email && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email) && <p className="text-xs text-green-500 mt-1">{t('emailValid')}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerUsername')}</label>
                        <input ref={usernameRef} type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={`w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border ${usernameError ? 'border-red-500' : 'border-[var(--theme-border-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]`} />
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
                                    <img src={avatar} alt={t('registerAvatar')} className={`w-full h-full ${avatarShape} object-cover`} width={64} height={64} />
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
                        <PasswordInput
                            ref={passwordRef}
                            value={password}
                            onChange={(e) => setPassword(e)}
                            placeholder={t('registerPassword')}
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] pr-10"
                            id="password"
                            required
                        />
                        <div className="mt-2">
                            <PasswordStrengthIndicator password={password} showRequirements={true} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('registerConfirmPass')}</label>
                        <PasswordInput
                            ref={confirmPasswordRef}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e)}
                            placeholder={t('registerConfirmPass')}
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] pr-10"
                            id="confirmPassword"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    
                    <div className="p-3 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]">
                        <HCaptcha
                            ref={captchaRef}
                            sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY ?? 'e8f869b0-7b7a-41b2-95f4-a5b013e4e6dc'}
                            onVerify={(token) => {
                                setCaptchaToken(token);
                                setCaptchaError('');
                            }}
                            onExpire={() => {
                                setCaptchaToken(null);
                                setCaptchaError('Captcha expired. Please verify again.');
                            }}
                            onError={() => {
                                setCaptchaToken(null);
                                setCaptchaError('Captcha failed. Please try again.');
                            }}
                            theme="dark"
                        />
                        {captchaError && <p className="text-red-500 text-sm mt-2">{captchaError}</p>}
                    </div>

                    <button 
                        type="submit" 
                        disabled={!captchaToken}
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