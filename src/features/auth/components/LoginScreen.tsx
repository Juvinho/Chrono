
import React, { useState, useEffect, useRef } from 'react';
// [DISABLED - DEV MODE] import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useLocation } from 'react-router-dom';
import GlitchText from '../../../components/ui/GlitchText';
import { User, Page } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { apiClient, mapApiUserToUser } from '../../../api';
import { validateNoEmojis } from '../../../utils/emojiValidation';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PasswordInput } from './PasswordInput';
import { useFormNavigation } from '../../../hooks/useFormNavigation';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    onNavigate: (page: Page, email?: string) => void;
}

export default function LoginScreen({ onLogin, onNavigate }: LoginScreenProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [twoFactorTempToken, setTwoFactorTempToken] = useState<string | null>(null);
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [error, setError] = useState('');
    const [dbError, setDbError] = useState('');
    const [message, setMessage] = useState('');
    // [DISABLED - DEV MODE]
    // const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    // const [captchaError, setCaptchaError] = useState('');
    // const captchaRef = useRef<HCaptcha>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

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

    // Form navigation refs (for Enter key navigation)
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const msg = sessionStorage.getItem('chrono_login_message');
        if (msg) {
            setMessage(msg);
            sessionStorage.removeItem('chrono_login_message');
        }

        const routeState = location.state as { message?: string; email?: string } | null;
        if (routeState?.message) {
            setMessage(routeState.message);
        }
        if (routeState?.email) {
            setUsername(routeState.email);
        }

        // Check backend health
        checkBackendHealth();
    }, [location.state]);

    // Form navigation: Allow Enter key to move between fields
    useFormNavigation(
        {
            fields: [
                { current: usernameRef.current, id: 'username' },
                { current: passwordRef.current, id: 'password' },
            ],
            onSubmit: () => {
                // On Enter in password field, submit the form
                const form = document.querySelector('form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { bubbles: true }));
                }
            },
            submitOnLastField: true,
        }
    );

    const checkBackendHealth = async () => {
        try {
            // Determine base URL (hacky but works for dev)
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const baseUrl = isLocal ? 'http://127.0.0.1:3001' : '';
            
            const response = await fetch(`${baseUrl}/health`);
            const data = await response.json();
            
            if (data.status === 'error' && data.db === 'disconnected') {
                const errorMsg = data.error || '';
                if (errorMsg.includes('ENETUNREACH')) {
                    setDbError('Erro de conexão com o banco de dados (Rede inacessível). Verifique a DATABASE_URL no Render.');
                } else {
                    setDbError('Banco de dados indisponível. Verifique as configurações de conexão.');
                }
                
                // If there's a specific error from backend, show it
                if (data.error) {
                    setError(`Backend Error: ${data.error}`);
                }
            } else {
                setDbError('');
            }
        } catch (e) {
            console.error('Health check failed:', e);
            setDbError('Não foi possível conectar ao servidor backend.');
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isLoading) return;
        
        // If 2FA is required, handle 2FA verification instead
        if (requiresTwoFactor && twoFactorTempToken) {
            await handle2FAVerify();
            return;
        }
        
        // Retry health check if there was an error
        if (dbError) {
             await checkBackendHealth();
             // If error persists, we still let them try, but it will likely fail
        }

        console.log('Login attempt starting...', { username });
        setError('');
        setMessage('');
        setRequiresEmailVerification(false);
        setUnverifiedEmail(null);
        setResendSuccess(false);

        // Client-side emoji validation
        const usernameValidation = validateNoEmojis(username, 'Nome de usuário');
        if (!usernameValidation.valid) {
            setError(usernameValidation.error);
            return;
        }

        // [DISABLED - DEV MODE] captcha check removed

        setIsLoading(true);

        try {
            console.log('Calling API login...');
            const response = await apiClient.login({
                username,
                password,
            });
            console.log('API response:', response);
            
            if (response.error) {
                if (response.error === 'rateLimitError') {
                    setRequiresEmailVerification(false);
                    setUnverifiedEmail(null);
                    setError(formatRetryAfterMessage(response.retryAfter));
                    setIsLoading(false);
                    return;
                }

                if (response.error === 'email_not_verified') {
                    const payload = (response.errorData || {}) as { email?: string; message?: string };
                    const loginValueLooksLikeEmail = username.includes('@') ? username : null;
                    const emailForResend = payload.email || loginValueLooksLikeEmail;

                    setRequiresEmailVerification(true);
                    setUnverifiedEmail(emailForResend);
                    setError('');
                    setMessage(
                        payload.message ||
                        'Seu email ainda não foi verificado. Um token de acesso foi enviado para seu email. Confirme o link e entre com o mesmo email e senha.'
                    );
                    setIsLoading(false);
                    return;
                }

                // [DISABLED - DEV MODE] hcaptcha error handler removed

                setRequiresEmailVerification(false);
                setUnverifiedEmail(null);
                setError(response.error);
                setIsLoading(false);
                return;
            }

            // Check if 2FA is required
            if (response.data?.requires_2fa && response.data?.temp_token) {
                setRequiresEmailVerification(false);
                setRequiresTwoFactor(true);
                setTwoFactorTempToken(response.data.temp_token);
                setIsLoading(false);
                return;
            }

            if (response.data?.user) {
                setRequiresEmailVerification(false);
                console.log('Login successful (httpOnly cookie set by server)');
                const user = mapApiUserToUser(response.data.user);
                
                try {
                    onLogin(user);
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

    const handleResendVerification = async () => {
        if (isResending) return;
        if (!unverifiedEmail) {
            setError('Não foi possível identificar seu email para reenvio. Tente fazer login informando seu email.');
            return;
        }
        setIsResending(true);
        setResendSuccess(false);
        try {
            const response = await apiClient.request<{ success: boolean; message: string }>('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email: unverifiedEmail }),
            });
            if (response.error) {
                if (response.error === 'rateLimitError') {
                    setError(formatRetryAfterMessage(response.retryAfter));
                } else {
                    setError(response.error);
                }
            } else {
                setResendSuccess(true);
                setError('');
                setMessage('📨 Token de acesso reenviado por email. Confirme o link e faça login com o mesmo email e senha.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao reenviar email');
        } finally {
            setIsResending(false);
        }
    };

    const handle2FAVerify = async () => {
        if (!twoFactorTempToken || isLoading) return;
        setIsLoading(true);
        setError('');

        // Validate that user provided an input
        if (!twoFactorCode && !recoveryCode) {
            setError('Por favor, insira o código de autenticador ou de recuperação.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await apiClient.request<{ user?: any; requires_2fa?: boolean }>('/auth/verify-2fa', {
                method: 'POST',
                body: JSON.stringify({
                    temp_token: twoFactorTempToken,
                    code: useRecoveryCode ? undefined : twoFactorCode || undefined,
                    recovery_code: useRecoveryCode ? recoveryCode || undefined : undefined,
                }),
            });

            if (response.error) {
                setError(response.error);
                setIsLoading(false);
                return;
            }

            if (response.data?.user) {
                const user = mapApiUserToUser(response.data.user);
                onLogin(user);
            } else {
                setError('Resposta inválida do servidor');
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Erro na verificação 2FA');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-[0_0_20px_rgba(138,43,226,0.2)]">
                <div className="text-center">
                    <GlitchText text="CHRONO" className="text-5xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">{t('loginSubtitle')}</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>
                    {dbError && (
                        <div className="p-3 text-sm font-bold text-red-500 bg-red-900/20 border border-red-500 rounded animate-pulse">
                            ⚠️ {dbError}
                        </div>
                    )}
                    <div>
                        <label htmlFor="username" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                            {t('loginUserID')}
                        </label>
                        <input
                            ref={usernameRef}
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
                        <PasswordInput
                            ref={passwordRef}
                            value={password}
                            onChange={(e) => setPassword(e)}
                            placeholder={t('loginPassword')}
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] pr-10"
                            id="password"
                            required
                        />
                        {password && (
                            <div className="mt-2">
                                <PasswordStrengthIndicator password={password} showRequirements={false} />
                            </div>
                        )}
                    </div>

                    {requiresTwoFactor && (
                        <div className="animate-fade-in space-y-3 p-4 border-2 border-[var(--theme-primary)] bg-black/30">
                            <p className="text-[10px] text-[var(--theme-primary)] text-center uppercase tracking-[0.3em] font-bold">
                                ◈ VERIFICAÇÃO 2FA NECESSÁRIA ◈
                            </p>

                            {!useRecoveryCode ? (
                                <>
                                    <label htmlFor="2fa" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                                        Código do autenticador (6 dígitos)
                                    </label>
                                    <input
                                        id="2fa"
                                        type="text"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        autoFocus
                                        className="w-full px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] text-[var(--theme-primary)] bg-black/50 border-2 border-[var(--theme-primary)] focus:outline-none shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.3)]"
                                    />
                                </>
                            ) : (
                                <>
                                    <label htmlFor="recovery" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                                        Código de recuperação (XXXX-XXXX)
                                    </label>
                                    <input
                                        id="recovery"
                                        type="text"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                                        placeholder="XXXX-XXXX"
                                        autoFocus
                                        className="w-full px-3 py-3 text-center text-xl font-mono tracking-widest text-amber-400 bg-black/50 border-2 border-amber-500/50 focus:outline-none"
                                    />
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => { setUseRecoveryCode(!useRecoveryCode); setError(''); }}
                                className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors w-full text-center"
                            >
                                {useRecoveryCode ? '← Usar código do autenticador' : 'Usar código de recuperação →'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setRequiresTwoFactor(false); setTwoFactorTempToken(null); setTwoFactorCode(''); setRecoveryCode(''); setError(''); }}
                                className="text-xs text-[var(--theme-text-secondary)] hover:text-red-400 transition-colors w-full text-center"
                            >
                                ← Cancelar e voltar ao login
                            </button>
                        </div>
                    )}

                    {error && !requiresEmailVerification && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    
                    {requiresEmailVerification && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
                            <p className="text-amber-400 text-sm font-medium">
                                ⚠️ Seu email ainda não foi verificado.
                            </p>
                            <p className="text-amber-400/70 text-xs">
                                {unverifiedEmail
                                    ? `Um token de acesso foi enviado para ${unverifiedEmail}. Abra o email e clique no link de ativação.`
                                    : 'Um token de acesso foi enviado para seu email cadastrado. Abra o email e clique no link de ativação.'}
                                {' '}Verifique também a pasta de spam.
                            </p>
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={isResending || resendSuccess || !unverifiedEmail}
                                className={`w-full py-2 text-sm rounded transition-colors ${
                                    resendSuccess 
                                        ? 'bg-green-500/20 text-green-400 cursor-default'
                                        : isResending
                                        ? 'bg-amber-500/10 text-amber-400/50 cursor-wait'
                                        : !unverifiedEmail
                                        ? 'bg-amber-500/10 text-amber-400/50 cursor-not-allowed'
                                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 cursor-pointer'
                                }`}
                            >
                                {isResending ? '⌛ Reenviando...' : resendSuccess ? '✅ Email reenviado!' : '📨 Reenviar email de verificação'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate(Page.Verify, unverifiedEmail || undefined)}
                                className="w-full py-2 text-sm rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
                            >
                                📄 Abrir página de verificação
                            </button>
                        </div>
                    )}

                    {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                    
                    {/* [DISABLED - DEV MODE] HCaptcha component removed */}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? '[ PROCESSANDO... ]' : `[ ${t('loginConnectButton')} ]`}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-[var(--theme-text-secondary)]">{t('loginNoAccount')} </span>
                    <button onClick={() => onNavigate(Page.Register)} className="font-bold text-[var(--theme-primary)] hover:underline">
                        {t('loginRegisterNow')}
                    </button>
                </div>
            </div>
        </div>
    );
}
