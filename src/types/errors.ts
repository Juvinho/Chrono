/**
 * Error Types - A-06: Replace catch (error: any)
 * Standardized error handling
 */

// Base Error Hierarchy
export interface ErrorResponse {
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp?: string;
}

// Network/API Error
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Validation Error
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public constraints?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Authentication Error
export class AuthError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'AuthError';
  }
}

// Authorization Error
export class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Database Error
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Server Error
export class ServerError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'ServerError';
  }
}

// Type guard functions
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

// Error mapping utility
export function mapError(error: unknown): ErrorResponse {
  if (isApiError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }

  if (isValidationError(error)) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      statusCode: 400,
      details: { field: error.field, constraints: error.constraints },
      timestamp: new Date().toISOString(),
    };
  }

  if (isAuthError(error)) {
    return {
      code: 'AUTH_ERROR',
      message: error.message,
      statusCode: 401,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }

  if (isAuthorizationError(error)) {
    return {
      code: 'AUTHORIZATION_ERROR',
      message: error.message,
      statusCode: 403,
      timestamp: new Date().toISOString(),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;
