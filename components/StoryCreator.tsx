import React, { useState, useRef } from 'react';
import { User, Story } from '../types';
import { CloseIcon, UploadIcon, CameraIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface StoryCreatorProps {
    currentUser: User;
    onClose: () => void;
    onSave: (story: Omit<Story, 'id' | 'timestamp' | 'expiresAt' | 'userId' | 'username' | 'userAvatar'>) => void;
}

export default function StoryCreator({ currentUser, onClose, onSave }: StoryCreatorProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');
    const [content, setContent] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setError(null);
            
            if (file.type.startsWith('video/')) {
                // Check video duration
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(video.src);
                    if (video.duration > 30) {
                        setError('Video must be 30 seconds or less.');
                        setPreviewUrl(null);
                        setMode('video'); // Still switch to video mode to show error context
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        if (cameraInputRef.current) cameraInputRef.current.value = '';
                    } else {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setPreviewUrl(reader.result as string);
                            setMode('video');
                        };
                        reader.readAsDataURL(file);
                    }
                };
                video.src = URL.createObjectURL(file);
            } else {
                // Image
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrl(reader.result as string);
                    setMode('image');
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSave = () => {
        if (mode === 'text' && !content.trim()) return;
        if ((mode === 'image' || mode === 'video') && !previewUrl) return;

        onSave({
            content: (mode === 'image' || mode === 'video') ? previewUrl! : content,
            type: mode,
            viewers: []
        });
        onClose();
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset to allow re-selection
            fileInputRef.current.click();
        }
    };

    const triggerCameraInput = () => {
        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
            cameraInputRef.current.click();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/10">
                    <CloseIcon className="w-8 h-8" />
                </button>
                <div className="flex gap-4">
                    <button 
                        onClick={() => { setMode('text'); setPreviewUrl(null); setError(null); }}
                        className={`font-bold ${mode === 'text' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                    >
                        TEXT
                    </button>
                    <button 
                        onClick={() => { setMode('image'); triggerFileInput(); setError(null); }}
                        className={`font-bold ${mode === 'image' || mode === 'video' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                    >
                        MEDIA
                    </button>
                </div>
                <button 
                    onClick={handleSave}
                    className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-500 disabled:opacity-50"
                    disabled={(mode === 'text' && !content) || ((mode === 'image' || mode === 'video') && !previewUrl)}
                >
                    {t('share') || 'Share'}
                </button>
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*" 
                onChange={handleFileChange}
            />
            
            {/* Camera specific input */}
            <input 
                type="file" 
                ref={cameraInputRef} 
                className="hidden" 
                accept="video/*" 
                capture="environment"
                onChange={handleFileChange}
            />

            {/* Canvas Area */}
            <div className="w-full h-full max-w-md bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                {error && (
                    <div className="absolute top-20 z-30 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                        {error}
                    </div>
                )}
                
                {mode === 'text' ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center p-8">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t('typeSomething') || 'Type something...'}
                            className="w-full bg-transparent text-white text-3xl font-bold text-center font-mono focus:outline-none resize-none placeholder-white/50"
                            rows={4}
                            autoFocus
                        />
                    </div>
                ) : (
                    previewUrl ? (
                        mode === 'video' ? (
                            <video src={previewUrl} controls className="w-full h-full object-contain" />
                        ) : (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        )
                    ) : (
                        <div className="flex flex-col gap-8">
                            <div className="text-gray-500 flex flex-col items-center gap-4 cursor-pointer hover:text-purple-400 transition-colors" onClick={triggerFileInput}>
                                <UploadIcon className="w-16 h-16" />
                                <span>Select media</span>
                            </div>
                            
                            <div className="text-gray-500 flex flex-col items-center gap-4 cursor-pointer hover:text-purple-400 transition-colors" onClick={triggerCameraInput}>
                                <CameraIcon className="w-16 h-16" />
                                <span>Record Video (30s max)</span>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
