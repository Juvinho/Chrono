// P-06: Consolidate formatTimestamp with centralized date.ts
// Re-export from utils/date.ts to maintain backward compatibility
export { formatMessageTimestamp as formatTimestamp } from '../../../utils/date';
export { formatMessageTime } from '../../../utils/date';
