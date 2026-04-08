import React, { useEffect, useState } from 'react';
import '../styles/glitchi-overlay.css';

interface GlitchiOverlayProps {
    senderUsername: string;
    onComplete: () => void;
}

export default function GlitchiOverlay({ senderUsername, onComplete }: GlitchiOverlayProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden bg-black/20">
            {/* Glitch distorsions */}
            <div className="absolute inset-0 animate-glitch-intense mix-blend-difference opacity-50 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500"></div>
            <div className="absolute inset-0 animate-glitch-shift mix-blend-overlay opacity-40 bg-white"></div>
            
            {/* Visual artifacts */}
            <div className="absolute top-1/4 left-0 w-full h-2 bg-red-600 animate-scanline-fast"></div>
            <div className="absolute top-3/4 left-0 w-full h-1 bg-blue-600 animate-scanline-fast" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Message */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/80 border-2 border-red-500 p-6 transform -skew-x-12 animate-glitch-text shadow-[0_0_20px_rgba(255,0,0,0.8)]">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                        SYSTEM BREACH: @{senderUsername} SENT A GLITCHI
                    </h2>
                    <p className="text-red-500 font-mono text-center mt-2 animate-pulse">
                        STABILIZING INTERFACE...
                    </p>
                </div>
            </div>
        </div>
    );
}
