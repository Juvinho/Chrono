
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
