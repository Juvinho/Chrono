
import React from 'react';
import GlitchText from './GlitchText';
import { Page, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface VerifyProps {
  email: string | null;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onNavigate: (page: Page) => void;
}

export default function Verify({ email, users, setUsers, onNavigate }: VerifyProps) {
    const { t } = useTranslation();

    const handleVerification = () => {
        const updatedUsers = users.map(user => {
            if (user.email === email && !user.isVerified) {
                return { ...user, isVerified: true };
            }
            return user;
        });
        setUsers(updatedUsers);
        alert(t('alertVerificationSuccess'));
        onNavigate(Page.Login);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] transition-colors duration-300">
            <div className="w-full max-w-lg p-8 text-center space-y-8 border-2 border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                <GlitchText text={t('verifyTitle')} className="text-4xl font-bold text-[var(--theme-text-light)]" />
                <p className="text-[var(--theme-text-primary)]">
                    {t('verifyMessage', { email: email || 'your email' })}
                </p>
                <button
                    onClick={handleVerification}
                    className="w-full max-w-xs mx-auto py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none"
                >
                    [ {t('verifyButton')} ]
                </button>
            </div>
        </div>
    );
}