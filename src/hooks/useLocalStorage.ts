
import { useState, useEffect } from 'react';
import { setCompressed, getCompressed, removeCompressed } from '../utils/storageManager';

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      // Tentar carregar dados comprimidos primeiro
      const compressed = getCompressed(key);
      if (compressed !== null) {
        return compressed;
      }

      // Fallback para JSON normal
      const jsonValue = localStorage.getItem(key);
      if (jsonValue != null) {
        try {
          const parsed = JSON.parse(jsonValue);
          
          if (typeof parsed === 'string' && parsed.startsWith('"') && parsed.endsWith('"')) {
            try {
              return JSON.parse(parsed);
            } catch {
              return parsed;
            }
          }
          
          return parsed;
        } catch (e) {
          console.warn(`[useLocalStorage] Erro ao parsear JSON para "${key}". Resetando para valor inicial.`, e);
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`[useLocalStorage] Erro ao ler localStorage "${key}":`, error);
    }

    if (typeof initialValue === 'function') {
      return (initialValue as () => T)();
    } else {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === undefined) {
        removeCompressed(key);
      } else {
        // Usa compressão com limite de tamanho automático
        const savedSuccessfully = setCompressed(key, value);
        if (!savedSuccessfully) {
          console.error(`[useLocalStorage] Falha ao salvar ${key} mesmo após otimização`);
        }
      }
    } catch (error: any) {
      console.error(`[useLocalStorage] Erro ao salvar "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as [T, typeof setValue];
}
