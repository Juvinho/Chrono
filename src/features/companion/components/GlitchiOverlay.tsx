import React, { useEffect, useState } from 'react';

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

            <style>{`
                @keyframes glitch-intense {
                    0% { transform: translate(0); clip-path: inset(0 0 0 0); }
                    10% { transform: translate(-5px, 2px); clip-path: inset(10% 0 40% 0); }
                    20% { transform: translate(5px, -2px); clip-path: inset(30% 0 20% 0); }
                    30% { transform: translate(-2px, 5px); clip-path: inset(60% 0 10% 0); }
                    40% { transform: translate(2px, -5px); clip-path: inset(10% 0 80% 0); }
                    50% { transform: translate(-8px, 3px); clip-path: inset(40% 0 40% 0); }
                    100% { transform: translate(0); clip-path: inset(0 0 0 0); }
                }
                @keyframes glitch-shift {
                    0% { transform: translateX(0); }
                    20% { transform: translateX(-10px) skewX(20deg); }
                    40% { transform: translateX(10px) skewX(-20deg); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px) skewY(10deg); }
                    100% { transform: translateX(0); }
                }
                @keyframes scanline-fast {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(1000%); }
                }
                @keyframes glitch-text {
                    0% { transform: scale(1) skewX(0); filter: hue-rotate(0deg); }
                    20% { transform: scale(1.1) skewX(10deg); filter: hue-rotate(90deg); }
                    40% { transform: scale(0.9) skewX(-10deg); filter: hue-rotate(180deg); }
                    60% { transform: scale(1.05) skewX(5deg); filter: hue-rotate(270deg); }
                    100% { transform: scale(1) skewX(0); filter: hue-rotate(360deg); }
                }
                .animate-glitch-intense { animation: glitch-intense 0.2s infinite; }
                .animate-glitch-shift { animation: glitch-shift 0.15s infinite; }
                .animate-scanline-fast { animation: scanline-fast 0.5s linear infinite; }
                .animate-glitch-text { animation: glitch-text 0.3s infinite; }
            `}</style>
        </div>
    );
}
