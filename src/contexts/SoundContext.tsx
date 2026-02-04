import React, { createContext, useContext, useEffect, useRef } from 'react';

type SoundType = 'notification' | 'post' | 'reply' | 'like' | 'follow' | 'blim';

interface SoundContextType {
    playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const isAudioInitialized = useRef(false);

    useEffect(() => {
        const initializeAudio = () => {
            if (!isAudioInitialized.current && typeof window !== 'undefined') {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                    audioContextRef.current = new AudioContext();
                    isAudioInitialized.current = true;
                    // Clean up event listeners once initialized
                    window.removeEventListener('click', initializeAudio);
                    window.removeEventListener('keydown', initializeAudio);
                    window.removeEventListener('touchstart', initializeAudio);
                }
            }
        };

        window.addEventListener('click', initializeAudio);
        window.addEventListener('keydown', initializeAudio);
        window.addEventListener('touchstart', initializeAudio);

        return () => {
            window.removeEventListener('click', initializeAudio);
            window.removeEventListener('keydown', initializeAudio);
            window.removeEventListener('touchstart', initializeAudio);
        };
    }, []);

    const playSound = (type: SoundType) => {
        if (!audioContextRef.current) return;

        // Resume context if suspended (browser policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const context = audioContextRef.current;
        const now = context.currentTime;
        
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.connect(gain);
        gain.connect(context.destination);

        switch (type) {
            case 'reply':
                // Two quick high beeps
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.setValueAtTime(1200, now + 0.1);
                
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            
            case 'post':
                // Soft low "pop"
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(300, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'like':
                // Positive "ding" (Major 3rd interval)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
                
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'follow':
                // Success sound (Ascending arpeggio)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, now); // A4
                oscillator.frequency.setValueAtTime(554.37, now + 0.1); // C#5
                oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
                
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.setValueAtTime(0.1, now + 0.2);
                gain.gain.linearRampToValueAtTime(0, now + 0.4);
                
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;

            case 'blim':
                // High-pitched sweet "blim" sound
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1200, now);
                oscillator.frequency.exponentialRampToValueAtTime(1500, now + 0.05);
                oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'notification':
            default:
                // Default notification: A5 drop
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, now); // A5
                oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.1);
            
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
        }
    };

    const contextValue = React.useMemo(() => ({ playSound }), []);

    return (
        <SoundContext.Provider value={contextValue}>
            {children}
        </SoundContext.Provider>
    );
};

export const useSound = () => {
    const context = useContext(SoundContext);
    if (context === undefined) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};
