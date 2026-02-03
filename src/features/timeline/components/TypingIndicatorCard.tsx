import React from 'react';

export default function TypingIndicatorCard() {
    return (
        <div className="reply-container animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex items-center space-x-3 p-3 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)]">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-bg-primary)] flex items-center justify-center flex-shrink-0 border-2 border-[var(--theme-border-primary)]">
                    <div className="w-5 h-5 text-2xl font-bold text-[var(--theme-secondary)] animate-pulse" style={{fontFamily: 'monospace'}}>?</div>
                </div>
                <div className="flex items-end space-x-1">
                    <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        </div>
    );
}
