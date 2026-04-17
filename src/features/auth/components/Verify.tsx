
import React, { useEffect, useState } from 'react';
import GlitchText from '../../../components/ui/GlitchText';
import { Page, User } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { apiClient } from '../../../api';

interface VerifyProps {
  email?: string | null;
  users?: User[]; // Deprecated, but keeping for compatibility
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>; // Deprecated
  onNavigate: (page: Page) => void;
}

export default function Verify({ email, onNavigate }: VerifyProps) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendMsg, setResendMsg] = useState('');

    useEffect(() => {
        // Check for token in URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            setStatus('verifying');
            verifyToken(token);
        } else if (email) {
            // Just showing the "Please check your email" screen
            setStatus('idle');
        } else {
             // Fallback for direct access without params
             setStatus('error');
             setMessage('Invalid access. No token provided.');
        }
    }, [email]);

    const verifyToken = async (token: string) => {
        try {
            const response = await apiClient.verifyEmail(token);
            if (response.error) {
                setStatus('error');
                setMessage(response.error);
            } else {
                setStatus('success');
                setMessage('Email verificado com sucesso! Agora você já pode entrar com o mesmo email e senha.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Erro ao verificar email. O link pode ter expirado.');
        }
    };

    const handleLoginRedirect = () => {
        onNavigate(Page.Login);
    };

    const handleResendEmail = async () => {
        if (!email || isResending) return;
        setIsResending(true);
        setResendMsg('');
        try {
            const response = await apiClient.request<{ success: boolean; message: string }>('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            if (response.error) {
                setResendMsg(`❌ ${response.error}`);
            } else {
                setResendMsg('✅ Email reenviado! Verifique sua caixa de entrada.');
            }
        } catch {
            setResendMsg('❌ Erro ao reenviar email.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-lg p-8 text-center space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <GlitchText text={t('verifyTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                
                {status === 'idle' && (
                    <div className="space-y-4">
                        <div className="text-6xl">📧</div>
                        <p className="text-[var(--theme-text-primary)]">
                            {t('verifyMessage', { email: email || 'seu email' })}
                        </p>
                        <div className="p-4 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded space-y-3">
                            <p className="text-sm text-[var(--theme-text-secondary)]">
                                Enviamos um token de acesso por email para <strong className="text-[var(--theme-primary)]">{email || 'seu email'}</strong>. 
                                Abra a mensagem e clique no link para ativar sua conta.
                            </p>
                            <p className="text-xs text-[var(--theme-text-secondary)] opacity-70">
                                💡 Verifique sua pasta de spam se não encontrar o email.
                            </p>
                        </div>

                        {resendMsg && (
                            <p className={`text-sm ${resendMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                {resendMsg}
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleResendEmail}
                                disabled={isResending || !email}
                                className={`w-full max-w-xs mx-auto py-2 px-4 transition-colors border ${
                                    isResending
                                        ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border-[var(--theme-border-primary)] cursor-wait'
                                        : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white'
                                }`}
                            >
                                {isResending ? '⌛ Reenviando...' : '📨 Reenviar Email de Verificação'}
                            </button>
                            <button
                                onClick={handleLoginRedirect}
                                className="w-full max-w-xs mx-auto py-2 px-4 bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] transition-colors"
                            >
                                ← Voltar para Login
                            </button>
                        </div>
                    </div>
                )}

                {status === 'verifying' && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[var(--theme-text-primary)] animate-pulse">VERIFICANDO CREDENCIAIS...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="text-green-500 text-6xl">✓</div>
                        <p className="text-xl text-[var(--theme-text-light)]">{message}</p>
                        <button
                            onClick={handleLoginRedirect}
                            className="w-full max-w-xs mx-auto py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none"
                        >
                            [ IR PARA LOGIN ]
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="text-red-500 text-6xl">!</div>
                        <p className="text-xl text-red-500">{message}</p>
                        <button
                            onClick={handleLoginRedirect}
                            className="w-full max-w-xs mx-auto py-2 px-4 bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}