import React, { useState, useEffect } from 'react';

interface AvatarProps {
    src?: string;
    alt?: string;
    className?: string;
    username?: string; // For fallback generation
    onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, username, onClick }) => {
    const [error, setError] = useState(false);
    
    // Reset error state when src changes
    useEffect(() => {
        setError(false);
    }, [src]);

    const handleOnError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.warn(`[Avatar] Load failed for user: ${username || 'unknown'}`, { src });
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
        
        // If it's a "rounded-full" or similar class, the div needs to respect it.
        // We assume className contains dimensions and shape (e.g., w-10 h-10 rounded-full).
        // We add flex center to center the initial.
        return (
            <div 
                className={`${className} flex items-center justify-center overflow-hidden`} 
                style={{ ...fallbackStyle }}
                onClick={onClick}
                role="img"
                aria-label={alt || username || 'Avatar'}
            >
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {(username || '?').charAt(0).toUpperCase()}
                </span>
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
