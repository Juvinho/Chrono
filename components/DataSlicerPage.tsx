import React, { useState, useRef } from 'react';
import { User, Page, Post, Notification, Conversation } from '../types';
import Header from './Header';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeVideo } from '../services/geminiService';
import { FilmIcon, UploadIcon } from './icons';

interface DataSlicerPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (page: Page, data?: string) => void;
  onNotificationClick: (notification: Notification) => void;
  allUsers: User[];
  allPosts: Post[];
  conversations: Conversation[];
  onOpenMarketplace?: () => void;
  onBack?: () => void;
}

export default function DataSlicerPage({
  user, onLogout, onNavigate, onNotificationClick, allUsers, allPosts, conversations, onOpenMarketplace, onBack
}: DataSlicerPageProps) {
  const { t } = useTranslation();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (query: string) => {
    sessionStorage.setItem('chrono_search_query', query);
    onNavigate(Page.Dashboard);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (videoFile) {
        const msg = t('dataSlicer_errorOnlyOneVideo');
        setError(msg);
        setTimeout(() => setError(null), 5000);
        // Reset the input value so the same file can be selected again if needed after removal
        event.target.value = ''; 
        return;
    }

    if (event.target.files && event.target.files.length > 1) {
        const msg = t('dataSlicer_errorOnlyOneVideo');
        setError(msg);
        setTimeout(() => setError(null), 5000);
        return;
    }

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('File size exceeds 50MB limit.');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!videoFile) {
        setError(t('dataSlicer_noVideo'));
        return;
    }
    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);
    
    const result = await analyzeVideo(prompt, videoFile);
    
    setAnalysisResult(result);
    setIsLoading(false);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header
        user={user}
        onLogout={onLogout}
        onViewProfile={(username) => onNavigate(Page.Profile, username)}
        onNavigate={onNavigate}
        onNotificationClick={onNotificationClick}
        onSearch={handleSearch}
        allPosts={allPosts}
        allUsers={allUsers}
        conversations={conversations}
        onOpenMarketplace={onOpenMarketplace}
        onBack={onBack}
      />
      <main className="flex-grow overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <FilmIcon className="w-10 h-10 text-[var(--theme-primary)] mr-4"/>
            <div>
              <h1 className="text-3xl font-bold text-[var(--theme-text-light)] mb-2 glitch-effect" data-text={t('dataSlicer_title')}>
                {t('dataSlicer_title')}
              </h1>
              <p className="text-[var(--theme-text-secondary)]">{t('dataSlicer_subtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Upload & Preview */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] space-y-4">
                <input
                    type="file"
                    accept="video/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] transition-colors"
                >
                    <UploadIcon className="w-12 h-12 text-[var(--theme-text-secondary)] mb-2"/>
                    <span className="font-bold text-[var(--theme-text-light)]">{t('dataSlicer_upload')}</span>
                    <span className="text-xs text-[var(--theme-text-secondary)]">{videoFile ? videoFile.name : 'Max 50MB'}</span>
                </button>

                {videoPreview && (
                    <div className="relative">
                        <video src={videoPreview} controls muted loop className="w-full aspect-video bg-black rounded-sm"></video>
                        <button 
                            onClick={handleRemoveVideo}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            title="Remove video"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}
            </section>

            {/* Right Column: Prompt & Result */}
            <section className="p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] flex flex-col">
                 <div className="space-y-1 flex-grow flex flex-col">
                  <label className="text-sm font-bold text-[var(--theme-text-secondary)] block">{t('dataSlicer_prompt')}</label>
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    rows={4} 
                    placeholder={t('dataSlicer_promptPlaceholder')}
                    className="w-full mt-1 px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" 
                   />
                </div>
                 <button 
                    onClick={handleAnalyze} 
                    disabled={!videoFile || isLoading}
                    className="w-full mt-4 py-2 px-4 bg-[var(--theme-primary)] text-white font-bold hover:bg-[var(--theme-secondary)] transition-colors disabled:opacity-50"
                 >
                    {isLoading ? t('dataSlicer_analyzing') : t('dataSlicer_analyze')}
                </button>
            </section>
          </div>
          
          {(isLoading || analysisResult || error) && (
            <section className="mt-8 p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
                 <h2 className="text-lg font-bold text-[var(--theme-secondary)] mb-4 pb-2 border-b-2 border-[var(--theme-border-primary)]">
                    :: {isLoading ? t('dataSlicer_analyzing') : t('dataSlicer_analysisComplete')}
                 </h2>
                 {isLoading && (
                     <div className="text-center p-10 flex flex-col items-center justify-center space-y-4 h-32">
                        <div className="flex space-x-2 items-end h-10">
                            <div className="w-2 h-4 bg-[var(--theme-primary)] animate-pulse"></div>
                            <div className="w-2 h-8 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-6 bg-[var(--theme-primary)] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                    </div>
                 )}
                 {error && <p className="text-red-500">{error}</p>}
                 {analysisResult && (
                    <div className="whitespace-pre-wrap text-[var(--theme-text-primary)]">
                        {analysisResult}
                    </div>
                 )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}