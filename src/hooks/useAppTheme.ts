import { useState, useEffect } from 'react';
import { User } from '../types';

export const useAppTheme = (currentUser: User | null) => {
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
            
            const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, []);

    const activeTheme = currentUser?.profileSettings?.theme || systemTheme;
    const activeAccent = currentUser?.profileSettings?.accentColor || 'purple';
    const activeEffect = currentUser?.profileSettings?.effect || 'none';
    const activeSkin = currentUser?.profileSettings?.themeSkin || 'default';
    const animationsDisabled = !(currentUser?.profileSettings?.animationsEnabled ?? true);

    useEffect(() => {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.remove('accent-purple', 'accent-green', 'accent-amber', 'accent-red', 'accent-blue');
        document.body.classList.remove('effect-scanline', 'effect-glitch_overlay');
        document.body.classList.remove('animations-disabled');
        document.body.classList.remove('skin-retro-terminal', 'skin-midnight-city', 'skin-solar-punk');
        
        document.body.classList.add(`theme-${activeTheme}`);
        document.body.classList.add(`accent-${activeAccent}`);
        
        if (activeEffect !== 'none') {
            document.body.classList.add(`effect-${activeEffect}`);
        }

        if (activeSkin !== 'default' && activeSkin) {
             document.body.classList.add(`skin-${activeSkin.toLowerCase().replace(/ /g, '-')}`);
        }
        
        if (animationsDisabled) {
            document.body.classList.add('animations-disabled');
        }
    }, [activeTheme, activeAccent, activeEffect, activeSkin, animationsDisabled]);

    return { activeTheme, systemTheme };
};
