import React, { useState, useRef, useEffect, memo } from 'react';
import { Post, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { CameraIcon, PollIcon, CalendarIcon, LockClosedIcon, MicrophoneIcon, ImageIcon, SparklesIcon } from './icons';
import { generateImage } from '../services/geminiService';
import FramePreview, { getFrameShape } from './FramePreview';

const MAX_CHARACTERS = 512;

interface PostComposerProps {
  currentUser: User;
  onClose: () => void;
  onSubmit: (postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'>, existingPostId?: string) => void;
  postToEdit?: Post | null;
  isSubmitting?: boolean;
  initialDate?: Date;
  inline?: boolean;
  initialContent?: string;
}

export const PostComposer: React.FC<PostComposerProps> = memo(({ currentUser, onClose, onSubmit, postToEdit, isSubmitting, initialDate, inline = false, initialContent = '' }) => {
  const { t, language } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [postDate, setPostDate] = useState<Date>(initialDate || new Date());

  // New state for image generation
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus textarea on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end if there is content
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  useEffect(() => {
    if (postToEdit) {
      setContent(postToEdit.content);
      setIsPrivate(postToEdit.isPrivate || false);
      setGeneratedImageUrl(postToEdit.imageUrl || null);
      setVideoUrl(postToEdit.videoUrl || null);
      if (postToEdit.pollOptions && postToEdit.pollOptions.length > 0) {
        setShowPoll(true);
        setPollOptions(postToEdit.pollOptions.map(opt => opt.option));
      }
    }
  }, [postToEdit]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (file.type.startsWith('video/')) {
            setVideoUrl(result);
            setGeneratedImageUrl(null);
        } else {
            setGeneratedImageUrl(result);
            setVideoUrl(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (inline) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [composerRef, onClose, inline]);

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert(t('speechRecognitionNotSupported'));
        return;
    }

    if (isListening) {
        recognitionRef.current?.stop();
        return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'pt' ? 'pt-BR' : 'en-US';

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        recognitionRef.current = null;
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript.trim() + ' ';
            }
        }
        if (finalTranscript) {
            setContent(prev => {
                const newContent = (prev + finalTranscript).trim();
                return newContent.length > MAX_CHARACTERS ? newContent.substring(0, MAX_CHARACTERS) : newContent;
            });
        }
    };

    recognition.start();
  };
  
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    const imageUrl = await generateImage(imagePrompt, aspectRatio);
    setGeneratedImageUrl(imageUrl);
    setIsGeneratingImage(false);
  };

  const handleSubmit = () => {
    const postData: Omit<Post, 'id' | 'author' | 'timestamp' | 'replies' | 'repostOf'> & { timestamp?: Date } = {
      content: content.trim(),
      isPrivate: isPrivate,
      imageUrl: generatedImageUrl || undefined,
      videoUrl: videoUrl || undefined,
      timestamp: postDate,
    };

    if (showPoll) {
      const validPollOptions = pollOptions
        .map(opt => opt.trim())
        .filter(opt => opt !== '');
      
      if (validPollOptions.length >= 2) {
        const oldOptions = postToEdit?.pollOptions?.map(o => o.option).join('||');
        const newOptions = validPollOptions.join('||');
        const optionsChanged = oldOptions !== newOptions;

        postData.pollOptions = validPollOptions.map(option => ({ 
            option, 
            votes: optionsChanged ? 0 : postToEdit?.pollOptions?.find(p => p.option === option)?.votes || 0
        }));

        if (optionsChanged) {
            postData.voters = {};
        } else {
            postData.voters = postToEdit?.voters;
        }

        const pollEndsAt = postToEdit?.pollEndsAt || new Date();
        if (!postToEdit?.pollEndsAt) {
            pollEndsAt.setDate(pollEndsAt.getDate() + 1);
        }
        postData.pollEndsAt = pollEndsAt;
      } else {
        // Signal to remove the poll by clearing options
        postData.pollOptions = undefined;
        postData.pollEndsAt = undefined;
        postData.voters = undefined;
      }
    } else if (postToEdit?.pollOptions) {
        // Poll UI is hidden, but original post had one, so preserve it
        postData.pollOptions = postToEdit.pollOptions;
        postData.pollEndsAt = postToEdit.pollEndsAt;
        postData.voters = postToEdit.voters;
    }
    
    onSubmit(postData, postToEdit?.id);
  };

  const charPercentage = (content.length / MAX_CHARACTERS) * 100;
  const isPostable = content.trim().length > 0 || generatedImageUrl || videoUrl;

  const containerClass = inline 
      ? "w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] p-4 rounded-lg mb-6" 
      : "modal-content w-full max-w-2xl";

  const contentElement = (
      <div ref={inline ? null : composerRef} className={containerClass}>
        <div className={`flex justify-between items-center pb-2 border-b border-[var(--theme-border-primary)] ${inline ? 'mb-4' : ''}`}>
          <h2 className="text-lg font-bold text-[var(--theme-text-light)]">{postToEdit ? t('postEditTitle') : t('transmitNewEcho')}</h2>
          {!inline && <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>}
        </div>
        
        <div className="py-4">
            <div className="flex space-x-4">
                <div className="relative w-10 h-10 flex-shrink-0">
                    {(() => {
                        const avatarShape = currentUser.equippedFrame ? getFrameShape(currentUser.equippedFrame.name) : 'rounded-full';
                        return (
                            <>
                                <img 
                                    src={currentUser.avatar} 
                                    alt={currentUser.username} 
                                    className={`w-full h-full ${avatarShape} object-cover`} 
                                />
                                {currentUser.equippedEffect && (
                                     <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                         <img 
                                            src={currentUser.equippedEffect.imageUrl} 
                                            alt="" 
                                            className="w-full h-full object-cover animate-pulse-soft"
                                         />
                                     </div>
                                )}
                                {currentUser.equippedFrame && (
                                    <div className="absolute -inset-1 z-20 pointer-events-none">
                                         <FramePreview item={currentUser.equippedFrame} />
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
                <textarea
                    placeholder={t('transmitNewEcho')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={MAX_CHARACTERS}
                    className="w-full h-32 bg-transparent text-[var(--theme-text-primary)] focus:outline-none resize-none text-lg"
                    autoFocus
                />
            </div>
            
            {(generatedImageUrl || isGeneratingImage || videoUrl) && (
                 <div className="mt-4 pl-14">
                    {isGeneratingImage ? (
                         <div className="w-full h-48 bg-[var(--theme-bg-tertiary)] flex items-center justify-center rounded-sm">
                            <div className="flex space-x-2 items-end h-10">
                               <div className="w-2 h-4 bg-[var(--theme-primary)] animate-pulse"></div>
                               <div className="w-2 h-8 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                               <div className="w-2 h-6 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                           </div>
                         </div>
                    ) : generatedImageUrl ? (
                        <div className="relative">
                            <img src={generatedImageUrl} alt="Generated" className="w-full max-h-72 object-contain rounded-sm" />
                             <button onClick={() => setGeneratedImageUrl(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">&times;</button>
                        </div>
                    ) : videoUrl ? (
                        <div className="relative">
                            <video src={videoUrl} controls className="w-full max-h-72 object-contain rounded-sm bg-black" />
                             <button onClick={() => setVideoUrl(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">&times;</button>
                        </div>
                    ) : null}
                 </div>
            )}

            {showImageGenerator && (
                <div className="mt-4 pl-14 space-y-2 animate-[fadeIn_0.3s_ease]">
                    <h3 className="text-sm font-bold text-[var(--theme-text-secondary)]">{t('generateImage')}</h3>
                    <div className="flex items-center space-x-2">
                         <input
                            type="text"
                            placeholder={t('imageGenerationPrompt')}
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            className="w-full px-3 py-1 text-sm text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                        />
                         <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="language-selector text-sm">
                             <option value="1:1">1:1</option>
                             <option value="16:9">16:9</option>
                             <option value="9:16">9:16</option>
                         </select>
                         <button onClick={handleGenerateImage} disabled={isGeneratingImage || !imagePrompt.trim()} className="p-2 bg-[var(--theme-primary)] text-white rounded-sm disabled:opacity-50">
                             <SparklesIcon className="w-5 h-5"/>
                         </button>
                    </div>
                </div>
            )}


            {showPoll && (
                <div className="mt-4 pl-14 space-y-2 animate-[fadeIn_0.3s_ease]">
                    {pollOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <input
                                type="text"
                                placeholder={t('pollOptionPlaceholder', { number: index + 1 })}
                                value={option}
                                onChange={(e) => handlePollOptionChange(index, e.target.value)}
                                className="w-full px-3 py-1 text-sm text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                maxLength={25}
                            />
                            {pollOptions.length > 2 && (
                                <button onClick={() => removePollOption(index)} className="text-red-500 font-bold">&times;</button>
                            )}
                        </div>
                    ))}
                    {pollOptions.length < 4 && (
                         <button onClick={addPollOption} className="text-sm text-[var(--theme-secondary)] hover:underline">
                            {t('pollAddOption')}
                        </button>
                    )}
                </div>
            )}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-[var(--theme-border-primary)]">
            <div className="flex items-center space-x-2 text-[var(--theme-text-secondary)]">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
                <button onClick={() => fileInputRef.current?.click()} title={t('attachMedia')} className="p-2 hover:text-[var(--theme-primary)] transition-colors"><CameraIcon className="w-6 h-6"/></button>
                 <button onClick={() => setShowImageGenerator(p => !p)} title={t('generateImage')} className={`p-2 transition-colors ${showImageGenerator ? 'text-[var(--theme-primary)]' : 'hover:text-[var(--theme-primary)]'}`}><ImageIcon className="w-6 h-6"/></button>
                <button onClick={() => setShowPoll(p => !p)} title={t('createPoll')} className={`p-2 transition-colors ${showPoll ? 'text-[var(--theme-primary)]' : 'hover:text-[var(--theme-primary)]'}`}><PollIcon className="w-6 h-6"/></button>
                <button
                    onClick={handleMicClick}
                    title={t('transcribeAudio')} 
                    className={`p-2 transition-colors rounded-full ${isListening ? 'text-red-500 bg-red-500/20 animate-pulse' : 'hover:text-[var(--theme-primary)]'}`}
                >
                    <MicrophoneIcon className="w-6 h-6"/>
                </button>
                <div className="relative group">
                    <input 
                        type="datetime-local" 
                        value={new Date(postDate.getTime() - (postDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)} 
                        onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) setPostDate(d);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <button title={t('schedulePost')} className="p-2 hover:text-[var(--theme-primary)] transition-colors group-hover:text-[var(--theme-primary)]">
                        <CalendarIcon className="w-6 h-6" />
                    </button>
                </div>
                <button title={t('encryptedPost')} className="p-2 hover:text-[var(--theme-primary)] transition-colors opacity-50 cursor-not-allowed"><LockClosedIcon className="w-6 h-6"/></button>
            </div>
            <div className="flex items-center space-x-4">
                 {isListening && <span className="text-sm text-red-500 animate-pulse">{t('listening')}</span>}
                 {postDate.getTime() !== initialDate?.getTime() && (
                    <span className="text-xs text-[var(--theme-secondary)]">
                        {postDate.toLocaleString()}
                    </span>
                 )}
                 <button onClick={() => setIsPrivate(p => !p)} title={isPrivate ? t('postPrivate') : t('postPublic')} className={`p-2 rounded-full transition-colors ${isPrivate ? 'text-[var(--theme-primary)] bg-[var(--theme-primary)]/20' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'}`}>
                    <LockClosedIcon className="w-5 h-5"/>
                 </button>
                 <div className="relative w-8 h-8">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={charPercentage > 100 ? '#D50000' : 'var(--theme-border-primary)'}
                            strokeWidth="2"
                        />
                        <path
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={charPercentage > 80 ? charPercentage > 95 ? '#D50000' : '#FFAB00' : 'var(--theme-primary)'}
                            strokeWidth="2"
                            strokeDasharray={`${charPercentage}, 100`}
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--theme-text-secondary)]">
                        {MAX_CHARACTERS - content.length}
                    </span>
                 </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={!isPostable}
                    className="bg-[var(--theme-primary)] text-white px-6 py-2 rounded-sm font-bold hover:bg-[var(--theme-secondary)] transition-colors disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-secondary)] disabled:cursor-not-allowed"
                >
                    {postToEdit ? t('postSaveChanges') : t('postSubmitButton')}
                </button>
            </div>
        </div>
      </div>
  );

  if (inline) {
    return contentElement;
  }

  return (
    <div className="modal-overlay">
      {contentElement}
    </div>
  );
});