import React, { useState, useRef } from 'react';
import GlitchText from '../../../components/ui/GlitchText';
import { Page } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { useFormNavigation } from '../../../hooks/useFormNavigation';
import { apiClient } from '../../../api';

interface ForgotPasswordProps {
    onNavigate: (page: Page, data?: string) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form navigation refs (for Enter key navigation)
    const emailRef = useRef<HTMLInputElement>(null);

    // Form navigation: Allow Enter key to submit
    useFormNavigation({
        fields: [
            { current: emailRef.current, id: 'email' }
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
        setIsLoading(true);

        try {
            const response = await apiClient.forgotPassword({ email });

            if (response.error) {
                setError(response.error);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError('Failed to initiate recovery. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
                <div className="w-full max-w-md p-8 space-y-8 border-2 border-green-500 bg-[var(--theme-bg-primary)] text-center">
                    <GlitchText text="SIGNAL SENT" className="text-4xl font-bold text-green-500" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">
                        Se o email existir na plataforma, enviamos um link de recuperação.
                        Abra seu email, clique no link e redefina sua senha.
                    </p>
                    <p className="text-xs text-[var(--theme-text-secondary)]">
                        O link expira em 1 hora. Verifique também a pasta de spam.
                    </p>
                    <button
                        onClick={() => onNavigate(Page.Login)}
                        className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none"
                    >
                        [ VOLTAR PARA LOGIN ]
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <div className="text-center">
                    <GlitchText text={t('forgotPasswordTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">{t('forgotPasswordSubtitle')}</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                            {t('registerEmail')}
                        </label>
                        <input
                            ref={emailRef}
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none disabled:opacity-50"
                    >
                       [ {isLoading ? 'PROCESSANDO...' : t('forgotPasswordSendCode')} ]
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
