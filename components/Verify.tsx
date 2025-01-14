
import React, { useEffect, useState } from 'react';
import GlitchText from './GlitchText';
import { Page, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { apiClient } from '../services/api';

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
                setMessage('Email verificado com sucesso! Você já pode fazer login.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Erro ao verificar email. O link pode ter expirado.');
        }
    };

    const handleLoginRedirect = () => {
        onNavigate(Page.Login);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-lg p-8 text-center space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <GlitchText text={t('verifyTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                
                {status === 'idle' && (
                    <div className="space-y-4">
                        <p className="text-[var(--theme-text-primary)]">
                            {t('verifyMessage', { email: email || 'seu email' })}
                        </p>
                        <div className="p-4 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded">
                            <p className="text-sm text-[var(--theme-text-secondary)]">
                                Enviamos um link de confirmação para sua caixa de entrada. Por favor, clique no link para ativar sua conta.
                            </p>
                        </div>
                        <button
                            onClick={handleLoginRedirect}
                            className="w-full max-w-xs mx-auto py-2 px-4 bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] transition-colors"
                        >
                            Voltar para Login
                        </button>
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