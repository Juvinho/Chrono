import React from 'react';

export default function PostSkeleton() {
    return (
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] mb-4 p-4 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-[var(--theme-bg-tertiary)] rounded-full mr-3"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-[var(--theme-bg-tertiary)] w-24 rounded"></div>
                        <div className="h-3 bg-[var(--theme-bg-tertiary)] w-16 rounded"></div>
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                <div className="h-4 bg-[var(--theme-bg-tertiary)] w-full rounded"></div>
                <div className="h-4 bg-[var(--theme-bg-tertiary)] w-5/6 rounded"></div>
                <div className="h-4 bg-[var(--theme-bg-tertiary)] w-4/6 rounded"></div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--theme-border-primary)] pt-4">
                <div className="flex space-x-4">
                    <div className="w-8 h-8 bg-[var(--theme-bg-tertiary)] rounded"></div>
                    <div className="w-8 h-8 bg-[var(--theme-bg-tertiary)] rounded"></div>
                    <div className="w-8 h-8 bg-[var(--theme-bg-tertiary)] rounded"></div>
                </div>
            </div>
        </div>
    );
}
