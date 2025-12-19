import React, { useState } from 'react';
import GlitchText from './GlitchText';
import { Page } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ResetPasswordProps {
    emailToReset: string | null;
    onPasswordReset: (email: string, newPass: string) => void;
    onNavigate: (page: Page) => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ emailToReset, onPasswordReset, onNavigate }) => {
    const { t } = useTranslation();
    const [securityCode, setSecurityCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!emailToReset) {
            setError(t('errorUnexpected'));
            return;
        }

        if (securityCode !== emailToReset) {
            setError(t('errorSecurityCodeIncorrect'));
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

        onPasswordReset(emailToReset, newPassword);
    };

    if (!emailToReset) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
                <div className="w-full max-w-md p-8 text-center">
                    <p className="text-red-500">{t('errorNoEmailForReset')}</p>
                    <button onClick={() => onNavigate(Page.ForgotPassword)} className="mt-4 font-bold text-[var(--theme-primary)] hover:underline">
                        {t('forgotPasswordTitle')}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-md p-8 space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <div className="text-center">
                    <GlitchText text={t('resetPasswordTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                    <p className="mt-2 text-[var(--theme-text-primary)]">{t('resetPasswordSubtitle')}</p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('resetPasswordSecurityCode')}</label>
                        <input type="text" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('resetPasswordNew')}</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('resetPasswordConfirm')}</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center glitch-effect" data-text={error}>{error}</p>}
                    
                    <button type="submit" className="w-full py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none">
                        [ {t('resetPasswordButton')} ]
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

export default ResetPassword;