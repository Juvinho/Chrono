import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import GlitchText from '../../../components/ui/GlitchText';
import { Page } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { useFormNavigation } from '../../../hooks/useFormNavigation';
import { apiClient } from '../../../api';

interface ResetPasswordProps {
    onNavigate: (page: Page) => void;
}

export default function ResetPassword({ onNavigate }: ResetPasswordProps) {
    const { t } = useTranslation();
    const { token } = useParams<{ token: string }>();
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form navigation refs (for Enter key navigation)
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);

    // Form navigation: Allow Enter key to move between fields
    useFormNavigation({
        fields: [
            { current: usernameRef.current, id: 'username' },
            { current: passwordRef.current, id: 'password' },
            { current: confirmRef.current, id: 'confirm' },
        ],
        onSubmit: () => {
            const form = document.querySelector('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true }));
            }
        },
        submitOnLastField: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Link de recuperação inválido ou expirado.');
            return;
        }

        if (!username.trim()) {
            setError('Informe seu nome de usuário para confirmar a troca de senha.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('errorPasswordMatch'));
            return;
        }
        if (newPassword.length < 6) {
            setError(t('errorPasswordShort'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.resetPassword({
                token,
                username: username.trim(),
                newPassword,
            });

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess(true);
            sessionStorage.setItem('chrono_login_message', 'Senha redefinida com sucesso. Faça login com sua nova senha.');
            setTimeout(() => onNavigate(Page.Login), 1800);
        } catch (err: any) {
            setError(err?.message || 'Falha ao redefinir senha. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
                <div className="w-full max-w-md p-8 text-center">
                    <p className="text-red-500">Link de recuperação inválido ou expirado.</p>
                    <button onClick={() => onNavigate(Page.ForgotPassword)} className="mt-4 font-bold text-[var(--theme-primary)] hover:underline">
                        Solicitar novo link
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
                <div className="w-full max-w-md p-8 text-center border-2 border-green-500 bg-[var(--theme-bg-primary)] space-y-4">
                    <GlitchText text="SENHA ATUALIZADA" className="text-3xl font-bold text-green-500" />
                    <p className="text-[var(--theme-text-primary)]">Sua senha foi redefinida com sucesso.</p>
                    <p className="text-xs text-[var(--theme-text-secondary)]">Redirecionando para o login...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <div className="text-center">
                    <GlitchText text={t('resetPasswordTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">Digite seu usuário e a nova senha para confirmar a recuperação.</p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">Usuário da conta</label>
                        <input 
                            ref={usernameRef}
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                            autoComplete="username"
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" 
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('resetPasswordNew')}</label>
                        <input 
                            ref={passwordRef}
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            required 
                            autoComplete="new-password"
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" 
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('resetPasswordConfirm')}</label>
                        <input 
                            ref={confirmRef}
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            autoComplete="new-password"
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" 
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    
                    <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed">
                        [ {isLoading ? 'ATUALIZANDO...' : t('resetPasswordButton')} ]
                    </button>
                </form>
                 <div className="text-center text-sm">
                    <button onClick={() => onNavigate(Page.Login)} className="font-bold text-[var(--theme-primary)] hover:underline">
                        {t('backToLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
}