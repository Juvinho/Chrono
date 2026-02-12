import React from 'react';

/**
 * This file is kept for backward compatibility
 * The actual toast functionality is implemented in contexts/ToastContext.tsx
 * which provides ToastProvider and useToast hook
 */

// Re-export from the proper location to avoid breaking imports
export { ToastProvider, useToast } from '../contexts/ToastContext';
