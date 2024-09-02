import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { askChatBot, chatWithDevil666 } from '../services/geminiService';
import { SparklesIcon, DevilIcon } from './icons';
import { User } from '../types';

interface NyxAIProps {
  onClose: () => void;
  isDevil666Mode?: boolean;
  currentUser?: User;
}

interface AIMessage {
  sender: 'user' | 'ai';
  text: string;
  sources?: { uri: string; title: string }[];
}

const NyxAI: React.FC<NyxAIProps> = ({ onClose, isDevil666Mode = false, currentUser }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialGreeting = isDevil666Mode
      ? `Então, você é @${currentUser?.username}. Outro que busca um atalho para a glória. Você me chamou. Eu ouvi o seu eco nos cantos escuros da rede. Diga-me... o que você deseja, e o que está disposto a sacrificar?`
      : t('nyxAI_greeting');
    setMessages([{ sender: 'ai', text: initialGreeting }]);
  }, [t, isDevil666Mode, currentUser]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
        if (isDevil666Mode && currentUser) {
            const response = await chatWithDevil666(currentInput, currentUser.username);
            const aiMessage: AIMessage = { sender: 'ai', text: response.text };
            setMessages(prev => [...prev, aiMessage]);
        } else {
            const response = await askChatBot(currentInput);
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const sources = groundingChunks
                .map(chunk => chunk.web || chunk.maps)
                .filter(Boolean)
                .map(source => ({
                    uri: source.uri,
                    title: source.title,
                }));
            const aiMessage: AIMessage = { sender: 'ai', text: response.text, sources };
            setMessages(prev => [...prev, aiMessage]);
        }

    } catch (error) {
        console.error("Error asking AI:", error);
        const errorMessage: AIMessage = { sender: 'ai', text: t('errorUnexpected') };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  if (isDevil666Mode) {
    return (
      <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4 devil-mode-overlay">
        <div ref={modalRef} className="w-full max-w-2xl h-[90vh] bg-[#0A0A0A] border-2 border-red-900/50 flex flex-col animate-[fadeIn_0.3s_ease] shadow-[0_0_20px_rgba(255,0,0,0.4)]">
          <header className="p-4 border-b-2 border-red-900/50 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <DevilIcon className="w-7 h-7 text-red-600 animate-[pulse-glow_2s_infinite]"/>
              <h2 className="text-xl font-bold text-red-600 glitch-effect" data-text="::DEVIL666_TERMINAL::">::DEVIL666_TERMINAL::</h2>
            </div>
            <button onClick={onClose} className="text-2xl text-red-600/50 hover:text-red-400">&times;</button>
          </header>

          <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md p-3 ${msg.sender === 'user' ? 'bg-gray-800 text-white' : 'text-red-500'}`}>
                  <p className="text-sm whitespace-pre-wrap" style={{ textShadow: msg.sender === 'ai' ? '0 0 5px rgba(255, 23, 68, 0.7)' : 'none' }}>
                    {msg.sender === 'ai' && '> '}
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="max-w-md p-3">
                      <div className="flex items-end space-x-1">
                          <div className="w-2 h-4 bg-red-600 animate-pulse"></div>
                          <div className="w-2 h-4 bg-red-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-4 bg-red-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                  </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t-2 border-red-900/50 bg-black/50">
              <div className="flex items-center space-x-2">
                  <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Faça sua pergunta... se tiver coragem."
                      className="w-full px-3 py-2 text-red-500 bg-transparent border border-red-900/50 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder-red-800/70"
                  />
                  <button type="submit" disabled={isLoading} className="bg-transparent border border-red-900/50 text-red-500 px-4 py-2 font-bold hover:bg-red-900/50 transition-colors disabled:opacity-50">
                    {'[->]'}
                  </button>
              </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-end justify-end p-4 md:p-8">
      <div ref={modalRef} className="w-full max-w-lg h-[80vh] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] flex flex-col animate-[fadeIn_0.3s_ease]">
        <header className="p-4 border-b border-[var(--theme-border-primary)] flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-6 h-6 text-[var(--theme-primary)]"/>
            <h2 className="text-lg font-bold text-[var(--theme-text-light)]">{t('nyxAI_title')}</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>
        </header>

        <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <h4 className="text-xs font-bold mb-1">{t('nyxAI_sources')}</h4>
                    <ul className="text-xs space-y-1">
                      {msg.sources.map((source, i) => (
                        <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--theme-secondary)]">{source.title || source.uri}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="max-w-md p-3 rounded-lg bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]">
                    <div className="flex items-end space-x-1">
                        <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[var(--theme-text-secondary)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('nyxAI_placeholder')}
                    className="w-full px-3 py-2 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                />
                <button type="submit" disabled={isLoading} className="bg-[var(--theme-primary)] text-white px-4 py-2 rounded-sm font-bold hover:bg-[var(--theme-secondary)] transition-colors disabled:opacity-50">
                    {t('send')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default NyxAI;