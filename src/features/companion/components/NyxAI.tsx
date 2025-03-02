import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { askChatBot } from '../../../utils/geminiService';
import { SparklesIcon } from '../../../components/ui/icons';
import { User } from '../../../types/index';

interface NyxAIProps {
  onClose: () => void;
  currentUser?: User;
}

export default function NyxAI({ onClose, currentUser }: NyxAIProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'ai' }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askChatBot(userMsg);
      setMessages(prev => [...prev, { text: response, sender: 'ai' }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { text: "Connection error with Neural Network...", sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
      <div ref={modalRef} className="w-full max-w-2xl h-[80vh] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] flex flex-col animate-[fadeIn_0.3s_ease]">
        <header className="p-4 border-b border-[var(--theme-border-primary)] flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-[var(--theme-primary)]"/>
            <h2 className="text-xl font-bold text-[var(--theme-text-light)]">NYX AI ASSISTANT</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">&times;</button>
        </header>

        <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)]'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--theme-bg-tertiary)] p-3 rounded-lg border border-[var(--theme-border-primary)]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)]">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query the system..."
              className="flex-grow bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] p-2 text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-[var(--theme-primary)] text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}