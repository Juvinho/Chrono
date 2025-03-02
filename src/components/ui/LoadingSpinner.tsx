import React from 'react';

export default function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] w-full p-8">
            <div className="flex items-end space-x-2 h-16 mb-4">
                <div className="w-4 h-12 bg-[var(--theme-primary)] animate-pulse" style={{ animationDuration: '1s' }}></div>
                <div className="w-4 h-20 bg-[var(--theme-primary)] animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
                <div className="w-4 h-16 bg-[var(--theme-primary)] animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
                <div className="w-4 h-8 bg-[var(--theme-primary)] animate-pulse" style={{ animationDelay: '0.6s', animationDuration: '1s' }}></div>
            </div>
            <p className="text-[var(--theme-primary)] animate-pulse font-bold tracking-widest text-lg">:: LOADING SYSTEM ::</p>
        </div>
    );
}
