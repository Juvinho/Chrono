
import React, { useState, useEffect } from 'react';
import GlitchText from './GlitchText';
import { User, Page } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { apiClient, mapApiUserToUser } from '../services/api';
import FramePreview, { getFrameShape } from './FramePreview';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    users: User[];
    onNavigate: (page: Page) => void;
}

function LoginScreen({ onLogin, users, onNavigate }: LoginScreenProps) {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const msg = sessionStorage.getItem('chrono_login_message');
        if (msg) {
            setMessage(msg);
            sessionStorage.removeItem('chrono_login_message');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        console.log('Login attempt starting...', { username, captchaVerified });
        setError('');
        setMessage('');

        if (!captchaVerified) {
            console.log('Captcha not verified');
            setError('Por favor, confirme que você não é um robô');
            return;
        }

        setIsLoading(true);

        try {
            console.log('Calling API login...');
            const response = await apiClient.login(username, password);
            console.log('API response:', response);
            
            if (response.error) {
                setError(response.error);
                setIsLoading(false);
                return;
            }

            if (response.data?.token && response.data?.user) {
                console.log('Login successful, setting token...');
                apiClient.setToken(response.data.token);
                const user = mapApiUserToUser(response.data.user);
                console.log('User mapped:', user);
                console.log('Calling onLogin prop type:', typeof onLogin);
                
                try {
                    onLogin(user);
                    console.log('onLogin executed successfully');
                } catch (e) {
                    console.error('Error executing onLogin:', e);
                    setError('Erro ao processar login na aplicação.');
                    setIsLoading(false);
                }
            } else {
                console.warn('Login response missing data:', response);
                setError('Resposta inválida do servidor');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || t('errorInvalidCredentials'));
            setIsLoading(false);
        }
    };

    const handleQuickLogin = (user: User) => {
        setUsername(user.username);
        setPassword(user.password || '');
        // Optional: Auto-submit
        // onLogin(user);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-[0_0_20px_rgba(138,43,226,0.2)]">
                <div className="text-center">
                    <GlitchText text="CHRONO" className="text-5xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">{t('loginSubtitle')}</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                            {t('loginUserID')}
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline">
                            <label
                                htmlFor="password"
                                className="text-sm font-bold text-[var(--theme-text-secondary)] block"
                            >
                                {t('loginPasscode')}
                            </label>
                            <button
                                type="button"
                                onClick={() => onNavigate(Page.ForgotPassword)}
                                className="text-xs text-[var(--theme-secondary)] hover:underline"
                            >
                                {t('loginForgotPassword')}
                            </button>
                        </div>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                    
                    <div className="flex items-center space-x-2 p-3 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]">
                        <input
                            type="checkbox"
                            id="captcha-login"
                            checked={captchaVerified}
                            onChange={(e) => setCaptchaVerified(e.target.checked)}
                            className="w-5 h-5 cursor-pointer accent-[var(--theme-primary)]"
                        />
                        <label htmlFor="captcha-login" className="text-sm text-[var(--theme-text-primary)] cursor-pointer flex-1">
                            Eu não sou um robô
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !captchaVerified}
                        className={`w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? '[ CONNECTING... ]' : `[ ${t('loginConnectButton')} ]`}
                    </button>
                </form>

                {users.length > 0 && (
                    <div className="pt-4 border-t border-[var(--theme-border-secondary)]">
                        <p className="text-xs text-center text-[var(--theme-text-secondary)] mb-3 tracking-widest">{t('loginDetectedIdentities')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {users.slice(0, 4).map(u => {
                                const avatarShape = u.equippedFrame ? getFrameShape(u.equippedFrame.name) : 'rounded-full';
                                return (
                                    <button
                                        key={u.username}
                                        onClick={() => handleQuickLogin(u)}
                                        className="flex items-center space-x-2 p-2 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-bg-secondary)] transition-all text-left"
                                    >
                                        <div className="relative w-8 h-8 flex-shrink-0">
                                            <img src={u.avatar} alt={u.username} className={`w-full h-full ${avatarShape} border border-[var(--theme-border-secondary)] object-cover`} />
                                            {u.equippedEffect && (
                                                <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                                    <img 
                                                        src={u.equippedEffect.imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover animate-pulse-soft"
                                                    />
                                                </div>
                                            )}
                                            {u.equippedFrame && (
                                                <div className="absolute -inset-1 z-20 pointer-events-none">
                                                    <FramePreview item={u.equippedFrame} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-[var(--theme-text-light)] truncate">@{u.username}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="text-center text-sm">
                    <span className="text-[var(--theme-text-secondary)]">{t('loginNoAccount')} </span>
                    <button onClick={() => onNavigate(Page.Register)} className="font-bold text-[var(--theme-primary)] hover:underline">
                        {t('loginRegisterNow')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
