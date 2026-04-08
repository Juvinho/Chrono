
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  
  return formatDate(date);
};

// Convert Date to URL format (mmm-DD-AAAA, e.g. feb-04-2026)
export const dateToUrlSegment = (date: Date): string => {
  const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

// Convert URL segment (mmm-DD-AAAA) back to Date
export const urlSegmentToDate = (segment: string): Date | null => {
  try {
    const parts = segment.toLowerCase().split('-');
    if (parts.length !== 3) return null;
    
    const monthStr = parts[0];
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) return null;
    
    const date = new Date(year, month, day);
    return date;
  } catch {
    return null;
  }
};

// Check if a post is within 24 hours from now (for visibility window)
export const isPostWithin24Hours = (postTimestamp: string | Date, now: Date = new Date()): boolean => {
  const postDate = typeof postTimestamp === 'string' ? new Date(postTimestamp) : postTimestamp;
  const timeDiff = now.getTime() - postDate.getTime();
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
  return timeDiff >= 0 && timeDiff <= twentyFourHoursInMs;
};

/**
 * Formata timestamp como tempo relativo (P-06: deduplicated from PostCard and NotificationsPanel)
 * Exemplo: "agora", "5m", "14:30", "ontem 14:30", "3d 14:30", "feb-04"
 */
/**
 * Formata tempo relativo para posts (P-06: centralized formatter)
 * Exemplo: "agora", "5m", "14:30", "ontem 14:30", "3d 14:30", "Feb-05"
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Menos de 1 minuto
  if (diffSecs < 60) {
    return 'agora';
  }
  
  // Menos de 1 hora
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  
  // Hoje
  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Ontem
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `ontem ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Últimos 7 dias
  if (diffDays <= 7) {
    return `${diffDays}d ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Mais anterior
  return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
};

/**
 * Formata timestamp para mensagens (Facebook Messenger style - P-06 unified)
 * Exemplo: "14:30", "Ontem", "Seg", "05/02"
 */
export const formatMessageTimestamp = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;
  
  // Hoje: 14:30
  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // Ontem
  if (diffInDays < 2 && date.getDate() === now.getDate() - 1) {
    return 'Ontem';
  }
  
  // Esta semana: Seg, Ter, Qua...
  if (diffInDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  
  // Mais antigo: 05/02
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * Formata apenas a hora da mensagem (14:30)
 */
export const formatMessageTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
