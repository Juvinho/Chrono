import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection using Double Submit Cookie Pattern
 * 
 * How it works:
 * 1. Server sets a `csrf_token` cookie (httpOnly: false — JS must read it)
 * 2. Frontend reads the cookie and sends the value as `X-CSRF-Token` header
 * 3. Server compares cookie value vs header value on mutation requests
 * 
 * An attacker on a different origin can trigger the browser to send cookies,
 * but CANNOT read the cookie value (same-origin policy) to set the header.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits

// Routes that are exempt from CSRF validation (public, pre-auth)
const CSRF_EXEMPT_ROUTES: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-verification',
  '/api/auth/verify-email',
  '/api/auth/email-verification',
  '/api/auth/verify-2fa',
  '/health',
];

// Methods that don't need CSRF protection (safe/idempotent)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Check if a route is exempt from CSRF validation
 */
function isExemptRoute(path: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(route => path.startsWith(route));
}

/**
 * Middleware: Ensure a CSRF cookie exists on every response.
 * If the client doesn't have one yet, generate and set it.
 */
export function csrfCookieSetter(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,    // Frontend JS MUST be able to read this
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
}

/**
 * Middleware: Validate CSRF token on mutation requests.
 * Compares the cookie value against the X-CSRF-Token header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip safe methods (GET, HEAD, OPTIONS)
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip exempt routes (login, register, etc.)
  if (isExemptRoute(req.path)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    console.warn(`[CSRF] Blocked ${req.method} ${req.path} — missing token (cookie: ${!!cookieToken}, header: ${!!headerToken})`);
    return res.status(403).json({ 
      error: 'CSRF token missing. Please refresh the page and try again.' 
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length || 
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    console.warn(`[CSRF] Blocked ${req.method} ${req.path} — token mismatch`);
    return res.status(403).json({ 
      error: 'CSRF token invalid. Please refresh the page and try again.' 
    });
  }

  next();
}

/**
 * Endpoint handler: GET /api/auth/csrf-token
 * Returns the current CSRF token (also sets the cookie if needed).
 * The frontend can call this on app load to ensure it has a valid token.
 */
export function csrfTokenEndpoint(req: Request, res: Response) {
  let token = req.cookies[CSRF_COOKIE_NAME];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.json({ csrfToken: token });
}
