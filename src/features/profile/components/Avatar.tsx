import React, { useState, useEffect } from 'react';
import { UserIcon } from '../../../components/ui/icons';

interface AvatarProps {
    src?: string;
    alt?: string;
    className?: string;
    username?: string; // For fallback generation
    onClick?: () => void;
}

export default function Avatar({ src, alt, className, username, onClick }: AvatarProps) {
    const [error, setError] = useState(false);
    
    // Reset error state when src changes
    useEffect(() => {
        setError(false);
    }, [src]);

    const handleOnError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        // console.warn(`[Avatar] Load failed for user: ${username || 'unknown'}`, { src });
        setError(true);
    };

    // Helper to generate consistent color from username
    const getFallbackStyle = (name: string) => {
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash % 360);
        return {
            backgroundColor: `hsl(${hue}, 70%, 20%)`,
            color: `hsl(${hue}, 100%, 70%)`
        };
    };

    if (error || !src) {
        const fallbackStyle = getFallbackStyle(username || '?');
        const initials = username ? username.slice(0, 2).toUpperCase() : '?';
        
        return (
            <div 
                className={`${className} flex items-center justify-center overflow-hidden font-bold select-none text-white`} 
                style={{ ...fallbackStyle, fontSize: '1.2em' }}
                onClick={onClick}
                role="img"
                aria-label={alt || username || 'Avatar'}
            >
                 {username ? initials : <UserIcon className="w-1/2 h-1/2 text-white opacity-80" />}
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt || username || 'Avatar'} 
            className={className}
            onError={handleOnError}
            loading="lazy"
            onClick={onClick}
        />
    );
};
