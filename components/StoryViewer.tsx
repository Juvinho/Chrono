import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Story, User } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import FramePreview, { getFrameShape } from './FramePreview';

interface StoryViewerProps {
    user: User;
    stories: Story[];
    onClose: () => void;
    onNextUser?: () => void;
    onPrevUser?: () => void;
    onViewStory?: (storyId: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ user, stories, onClose, onNextUser, onPrevUser, onViewStory }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentStory = stories[currentIndex];
    const DEFAULT_DURATION = 5000; // 5 seconds for text/image

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
            setVideoDuration(null); // Reset video duration
        } else {
            if (onNextUser) {
                onNextUser();
            } else {
                onClose();
            }
        }
    }, [currentIndex, stories.length, onNextUser, onClose]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
            setVideoDuration(null); // Reset video duration
        } else {
            if (onPrevUser) {
                onPrevUser();
            } else {
                // Restart current user stories? or Close?
                setCurrentIndex(0);
                setProgress(0);
                setVideoDuration(null);
            }
        }
    }, [currentIndex, onPrevUser]);

    useEffect(() => {
        if (currentStory && onViewStory) {
            onViewStory(currentStory.id);
        }
    }, [currentStory, onViewStory]);

    useEffect(() => {
        const isVideo = currentStory?.type === 'video';
        
        // If it's a video, we rely on onTimeUpdate and onEnded, so we don't need this interval timer
        // unless the video fails to load or something, but let's stick to video events for accuracy.
        if (isVideo) {
             return; 
        }

        const duration = DEFAULT_DURATION;
        const intervalTime = 100;
        const step = 100 / (duration / intervalTime);

        const timer = setInterval(() => {
            setProgress(old => {
                if (old >= 100) {
                    handleNext();
                    return 100;
                }
                return old + step;
            });
        }, intervalTime);

        return () => clearInterval(timer);
    }, [currentIndex, handleNext, currentStory?.type]);

    const handleVideoEnded = () => {
        handleNext();
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current && videoRef.current.duration) {
             const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
             setProgress(percentage);
        }
    };

    const handleVideoLoadedMetadata = () => {
        if (videoRef.current) {
            setVideoDuration(videoRef.current.duration);
            videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, onClose]);

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col items-center justify-center">
            {/* Header / Progress */}
            <div className="absolute top-4 w-full max-w-md px-4 flex flex-col gap-2 z-20">
                <div className="flex gap-1 h-1">
                    {stories.map((story, idx) => (
                        <div key={story.id} className="h-full flex-1 bg-gray-600 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{ 
                                    width: idx < currentIndex ? '100%' : 
                                           idx === currentIndex ? `${progress}%` : '0%' 
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 flex-shrink-0">
                            {(() => {
                                const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
                                return (
                                    <>
                                        <img 
                                            src={user.avatar} 
                                            alt={user.username} 
                                            className={`w-full h-full ${avatarShape} border border-white object-cover`} 
                                        />
                                        {user.equippedEffect && (
                                            <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                                <img 
                                                    src={user.equippedEffect.imageUrl} 
                                                    alt="" 
                                                    className="w-full h-full object-cover animate-pulse-soft"
                                                />
                                            </div>
                                        )}
                                        {user.equippedFrame && (
                                            <div className="absolute -inset-1 z-20 pointer-events-none">
                                                <FramePreview item={user.equippedFrame} />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                        <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{user.username}</span>
                        <span className="text-gray-300 text-xs">{new Date(currentStory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded-full">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative w-full max-w-md h-full md:h-[80vh] bg-[#111] md:rounded-lg overflow-hidden flex items-center justify-center">
                {/* Click areas for navigation */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={(e) => {
                     // If clicking video controls, don't next
                     if ((e.target as HTMLElement).tagName === 'VIDEO') return;
                     handleNext();
                }} />

                {currentStory.type === 'image' ? (
                    <img 
                        src={currentStory.content} 
                        alt="Story" 
                        className="w-full h-full object-cover" 
                    />
                ) : currentStory.type === 'video' ? (
                    <video 
                        ref={videoRef}
                        src={currentStory.content} 
                        className="w-full h-full object-contain"
                        autoPlay
                        playsInline
                        onEnded={handleVideoEnded}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onTimeUpdate={handleVideoTimeUpdate}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-purple-900 via-black to-blue-900">
                        <p className="text-white text-2xl font-bold text-center font-mono animate-pulse">
                            {currentStory.content}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryViewer;
