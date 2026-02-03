
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const jsonValue = localStorage.getItem(key);
      if (jsonValue != null) {
        try {
          // Attempt to parse the stored value
          const parsed = JSON.parse(jsonValue);
          
          // Special case: if we got a string but it's empty or looks like broken JSON,
          // and we expected an object/array, we should fallback.
          if (typeof parsed === 'string' && parsed.startsWith('"') && parsed.endsWith('"')) {
            // This looks like double-stringified data, try one more parse
            try {
              return JSON.parse(parsed);
            } catch {
              return parsed;
            }
          }
          
          return parsed;
        } catch (e) {
          console.warn(`[useLocalStorage] Failed to parse JSON for key "${key}". Resetting to initial value.`, e);
          // If parsing fails, it's safer to remove the item and use initialValue
          // than to return the raw string which might cause further crashes.
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error reading localStorage key "${key}":`, error);
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
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error saving to localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as [T, typeof setValue];
}
