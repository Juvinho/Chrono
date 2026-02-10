import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

const EMAIL_RATE_LIMIT = {
  maxRequests: 3, // Max 3 requests
  windowMs: 60 * 60 * 1000 // Per hour
};

/**
 * Middleware to rate limit email verification requests
 * Max 3 emails per hour per IP address
 */
export function verificationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Initialize or get rate limit data
    if (!rateLimitStore[identifier]) {
      rateLimitStore[identifier] = {
        count: 0,
        resetTime: now + EMAIL_RATE_LIMIT.windowMs
      };
    }

    const limitData = rateLimitStore[identifier];

    // Reset if window has passed
    if (now > limitData.resetTime) {
      limitData.count = 0;
      limitData.resetTime = now + EMAIL_RATE_LIMIT.windowMs;
    }

    // Check if limit exceeded
    if (limitData.count >= EMAIL_RATE_LIMIT.maxRequests) {
      const resetIn = Math.ceil((limitData.resetTime - now) / 1000 / 60); // Minutes remaining
      return res.status(429).json({
        error: 'Too many requests',
        message: `Too many verification emails sent. Please try again in ${resetIn} minute(s).`,
        retryAfter: limitData.resetTime
      });
    }

    // Increment counter
    limitData.count++;

    // Add rate limit info to response header
    res.setHeader('X-RateLimit-Limit', EMAIL_RATE_LIMIT.maxRequests);
    res.setHeader('X-RateLimit-Remaining', EMAIL_RATE_LIMIT.maxRequests - limitData.count);
    res.setHeader('X-RateLimit-Reset', limitData.resetTime);

    next();
  } catch (error) {
    console.error('Error in rate limit middleware:', error);
    // Don't block on error
    next();
  }
}

/**
 * Middleware to require verified email
 */
export function requireVerifiedEmail(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before accessing this resource.',
        userID: req.userId
      });
    }
    next();
  } catch (error) {
    console.error('Error in requireVerifiedEmail middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Cleanup old rate limit entries periodically
 * Runs every hour to prevent memory leaks
 */
export function startRateLimitCleanup() {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of Object.entries(rateLimitStore)) {
      // Remove entries that have been inactive for more than 24 hours
      if (now - value.resetTime > 24 * 60 * 60 * 1000) {
        delete rateLimitStore[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} rate limit entries`);
    }
  }, 60 * 60 * 1000); // Every hour

  console.log('📊 Rate limit cleanup scheduler started');
}
