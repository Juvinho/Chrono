import React, { useState } from 'react';
import GlitchText from './GlitchText';
import { User, Page } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ForgotPasswordProps {
    users: User[];
    onNavigate: (page: Page, data?: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ users, onNavigate }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userExists = users.some(u => u.email === email);

        if (userExists) {
            onNavigate(Page.ResetPassword, email);
        } else {
            setError(t('errorEmailNotFound'));
        }
    };

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
                        className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none"
                    >
                       [ {t('forgotPasswordSendCode')} ]
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
};

export default ForgotPassword;
