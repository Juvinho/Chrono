import React, { useState } from 'react';
import GlitchText from './GlitchText';
import { User, Page } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { apiClient } from '../services/api';

interface ForgotPasswordProps {
    users: User[];
    onNavigate: (page: Page, data?: string) => void;
}

export default function ForgotPassword({ users, onNavigate }: ForgotPasswordProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState<'email' | 'sms'>('email');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // MIGRATION: API Call for password recovery
            const response = await apiClient.request('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ 
                    email: method === 'email' ? email : undefined,
                    phone: method === 'sms' ? phone : undefined,
                    method 
                })
            });

            if (response.error) {
                setError(response.error);
            } else {
                setSuccess(true);
                // After 3 seconds, navigate to reset page or verification
                setTimeout(() => onNavigate(Page.ResetPassword, method === 'email' ? email : phone), 3000);
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
                        Instruções de recuperação enviadas para seu {method === 'email' ? 'e-mail' : 'telefone'}.
                        Redirecionando...
                    </p>
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

                <div className="flex border-b border-[var(--theme-border-primary)]">
                    <button 
                        onClick={() => setMethod('email')}
                        className={`flex-1 py-2 text-sm font-bold ${method === 'email' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                    >
                        E-MAIL
                    </button>
                    <button 
                        onClick={() => setMethod('sms')}
                        className={`flex-1 py-2 text-sm font-bold ${method === 'sms' ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                    >
                        SMS / TELEFONE
                    </button>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {method === 'email' ? (
                        <div>
                            <label htmlFor="email" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                                {t('registerEmail')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="phone" className="text-sm font-bold text-[var(--theme-text-secondary)] block">
                                Telefone (com DDD)
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                placeholder="+55 (11) 99999-9999"
                                className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                    )}
                    
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
