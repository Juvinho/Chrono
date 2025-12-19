import React, { useState, useEffect } from 'react';
import GlitchText from './GlitchText';
import { Page } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface WelcomeProps {
    onNavigate: (page: Page) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
    const { t } = useTranslation();
    const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);

    useEffect(() => {
        // Check URL parameters for verification status
        const urlParams = new URLSearchParams(window.location.search);
        const verifyStatus = urlParams.get('verify');
        
        if (verifyStatus === 'success') {
            setShowVerificationSuccess(true);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] text-center p-4 welcome-animation-container transition-colors duration-300">
            {showVerificationSuccess && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVerificationSuccess(false)}>
                    <div className="bg-[var(--theme-bg-secondary)] border-2 border-[var(--theme-primary)] p-8 max-w-md mx-4 rounded-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="text-4xl mb-4">✓</div>
                        <h2 className="text-2xl font-bold text-[var(--theme-text-light)] mb-4">
                            Conta Ativada!
                        </h2>
                        <p className="text-[var(--theme-text-primary)] mb-6">
                            Sua conta foi ativada com sucesso. Agora você pode fazer login e começar a usar o Chrono.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowVerificationSuccess(false);
                                    onNavigate(Page.Login);
                                }}
                                className="flex-1 py-3 px-6 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors rounded-sm"
                            >
                                Fazer Login
                            </button>
                            <button
                                onClick={() => setShowVerificationSuccess(false)}
                                className="flex-1 py-3 px-6 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-bold hover:bg-[var(--theme-bg-primary)] transition-colors rounded-sm border border-[var(--theme-border-primary)]"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
             <div className="w-full max-w-2xl p-8 space-y-8">
                <GlitchText text="CHRONO" className="text-7xl md:text-9xl font-bold text-[var(--theme-text-light)]" />
                <h1 className="text-xl md:text-2xl text-[var(--theme-text-primary)] font-light tracking-widest glitch-effect" data-text={t('welcomeTitle')}>
                    {t('welcomeTitle')}
                </h1>
                <p className="text-md text-[var(--theme-text-secondary)]">
                    {t('welcomeSubtitle')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <button
                        onClick={() => onNavigate(Page.Login)}
                        className="w-full sm:w-auto py-3 px-10 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors duration-300 border border-[var(--theme-secondary)] focus:outline-none neon-glow-hover"
                    >
                        {t('welcomeEnter')}
                    </button>
                    <button
                        onClick={() => onNavigate(Page.Register)}
                        className="w-full sm:w-auto py-3 px-10 border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold hover:bg-[var(--theme-primary)] hover:text-white transition-colors duration-300 focus:outline-none neon-glow-hover"
                    >
                        {t('welcomeRegister')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Welcome;