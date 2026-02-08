import { useEffect, useRef, useCallback } from 'react';

interface UseHourlyRefreshOptions {
  onNewDay?: () => void;
  onHourChange?: () => void;
}

/**
 * Custom hook que detecta mudanças de hora/dia e executa callbacks
 * Útil para trending topics que devem resetar a cada novo dia
 */
export const useHourlyRefresh = ({ onNewDay, onHourChange }: UseHourlyRefreshOptions) => {
  const lastDayRef = useRef<number>(new Date().getDate());
  const lastHourRef = useRef<number>(new Date().getHours());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Callback to check for day/hour changes
  const checkTimeChange = useCallback(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();

    // Check if day changed
    if (currentDay !== lastDayRef.current) {
      console.log('📅 [HourlyRefresh] Day changed! Triggering refresh...', {
        oldDay: lastDayRef.current,
        newDay: currentDay,
      });
      lastDayRef.current = currentDay;
      onNewDay?.();
    }

    // Check if hour changed
    if (currentHour !== lastHourRef.current) {
      console.log('🕐 [HourlyRefresh] Hour changed!', {
        oldHour: lastHourRef.current,
        newHour: currentHour,
      });
      lastHourRef.current = currentHour;
      onHourChange?.();
    }
  }, [onNewDay, onHourChange]);

  useEffect(() => {
    // Check immediately
    checkTimeChange();

    // Then check every minute (60 seconds)
    checkIntervalRef.current = setInterval(() => {
      checkTimeChange();
    }, 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkTimeChange]);

  return {
    currentDay: new Date().getDate(),
    currentHour: new Date().getHours(),
  };
};
