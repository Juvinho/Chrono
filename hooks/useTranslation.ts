
import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../locales';

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
      const savedLang = localStorage.getItem('chrono_lang') as Language;
      return savedLang || 'pt';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('chrono_lang', lang);
    setLanguageState(lang);
    document.documentElement.lang = lang;
  };
  
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, replacements?: { [key: string]: string | number }) => {
    let translation = translations[language][key as keyof typeof translations.en] || translations['en'][key as keyof typeof translations.en] || key;
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            translation = translation.replace(`{${placeholder}}`, String(replacements[placeholder]));
        });
    }
    return translation;
  };

  // FIX: Replaced JSX with React.createElement to prevent parsing errors in a .ts file.
  // This resolves a series of cryptic TypeScript errors related to JSX syntax.
  return React.createElement(LanguageContext.Provider, { value: { language, setLanguage, t } }, children);
}

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
