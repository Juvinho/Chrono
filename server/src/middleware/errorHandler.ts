import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Send a standardized error response
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: string
) => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  res.status(statusCode).json(response);
};

/**
 * Send a standardized success response
 */
export const sendSuccessResponse = <T>(res: Response, data: T, statusCode = 200) => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
};

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: Function
) => {
  console.error('❌ Unhandled error:', err.message);
  
  // Don't expose internal error details in production
  const details = process.env.NODE_ENV === 'development' ? err.message : undefined;
  const message = err.message || 'An unexpected error occurred';
  
  sendErrorResponse(
    res,
    err.statusCode || 500,
    err.code || 'INTERNAL_ERROR',
    message,
    details
  );
};
