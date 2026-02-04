
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
    } catch (error: any) {
      // Handle QuotaExceededError by cleaning old data
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn(`[useLocalStorage] Quota exceeded for key "${key}". Attempting to free space...`);
        
        try {
          // Try to clear old/unused keys first
          const keysToClean = [
            'chrono_posts_v2',
            'chrono_posts_v3',
            'chrono_conversations_v2',
            'chrono_conversations_v3',
            'chrono_users_v2',
            'chrono_users_v3',
          ];
          
          // Don't clean the current key or critical keys
          const criticalKeys = ['chrono_token', 'chrono_currentUser_v4', key];
          
          for (const oldKey of keysToClean) {
            if (!criticalKeys.includes(oldKey)) {
              try {
                localStorage.removeItem(oldKey);
                console.log(`[useLocalStorage] Cleaned old key: ${oldKey}`);
              } catch (e) {
                // Ignore errors when cleaning
              }
            }
          }
          
          // Try to save again after cleaning
          try {
            localStorage.setItem(key, JSON.stringify(value));
            console.log(`[useLocalStorage] Successfully saved after cleaning old data`);
            return;
          } catch (retryError) {
            // If still fails, try to reduce data size for arrays/objects
            if (Array.isArray(value) && value.length > 0) {
              // Keep only last 50 items for arrays
              const reduced = value.slice(-50);
              try {
                localStorage.setItem(key, JSON.stringify(reduced));
                console.warn(`[useLocalStorage] Reduced array size for key "${key}" to last 50 items`);
                return;
              } catch (e) {
                // Still failed
              }
            }
          }
        } catch (cleanError) {
          console.error(`[useLocalStorage] Failed to clean localStorage:`, cleanError);
        }
        
        console.error(`[useLocalStorage] Error saving to localStorage key "${key}":`, error);
        console.warn(`[useLocalStorage] Please clear your browser's localStorage manually or use less data.`);
      } else {
        console.error(`[useLocalStorage] Error saving to localStorage key "${key}":`, error);
      }
    }
  }, [key, value]);

  return [value, setValue] as [T, typeof setValue];
}
