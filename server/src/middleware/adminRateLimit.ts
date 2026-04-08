import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware for admin routes
 * Protects admin endpoints from brute force attacks and abuse
 */

/**
 * General admin rate limit - applies to most admin operations
 * 60 requests per hour per IP
 */
export const adminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60, // 60 requests per hour
  message: 'Too many admin requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit GET requests for read operations
    return req.method === 'GET';
  },
});

/**
 * Strict rate limit for sensitive admin operations
 * 10 requests per hour per IP for write operations
 */
export const adminStrictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: 'Too many admin write operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limit for admin authentication/login attempts
 * 5 requests per 15 minutes per IP
 */
export const adminAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many admin login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Read-only rate limit for admin GET operations
 * 120 requests per hour per IP (more permissive than write)
 */
export const adminReadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120, // 120 requests per hour
  message: 'Too many admin read requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to GET requests
    return req.method !== 'GET';
  },
});
