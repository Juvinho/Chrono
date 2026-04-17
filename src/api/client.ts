// src/api/client.ts

/**
 * Read a cookie value by name from document.cookie
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const envBase = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    if (envBase && typeof envBase === 'string' && envBase.length > 0) {
      return envBase;
    }
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || 
                   hostname === '127.0.0.1' || 
                   hostname.startsWith('192.168.') || 
                   hostname.startsWith('10.') || 
                   hostname.startsWith('172.');
    
    if (isLocal) {
      // Se estiver acessando via rede local, usa o mesmo hostname mas na porta do backend (3001)
      return `http://${hostname}:3001/api`;
    }
    // No Railway ou Render, usamos URL relativa para evitar problemas de domínio fixo
    return '/api';
  }
  return 'http://127.0.0.1:3001/api';
};

export const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  retryAfter?: number;
  /** HTTP status code, present only on error responses */
  status?: number;
  /** Raw error payload returned by API for contextual handling */
  errorData?: unknown;
}

const CLIENT_ID_STORAGE_KEY = 'chrono_client_id_v1';
const RATE_LIMIT_STORAGE_KEY = 'chrono_rate_limit_v1';
const DEFAULT_RATE_LIMIT_MS = 5000;

type RateLimitMap = Record<string, number>;

const getRateLimitBucket = (method: string, endpoint: string): string => {
  const normalizedEndpoint = endpoint.split('?')[0].toLowerCase();

  if (method === 'POST' && normalizedEndpoint === '/auth/login') {
    return 'auth:login';
  }

  if (method === 'POST' && normalizedEndpoint === '/auth/register') {
    return 'auth:register';
  }

  if (method === 'POST' && normalizedEndpoint === '/auth/resend-verification') {
    return 'auth:resend-verification';
  }

  return 'global';
};

const parseRetryAfterMs = (retryAfterHeader: string | null): number => {
  if (!retryAfterHeader) {
    return DEFAULT_RATE_LIMIT_MS;
  }

  const seconds = Number.parseInt(retryAfterHeader, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(retryAfterHeader);
  if (!Number.isNaN(retryAt)) {
    return Math.max(retryAt - Date.now(), DEFAULT_RATE_LIMIT_MS);
  }

  return DEFAULT_RATE_LIMIT_MS;
};

const readRateLimitMap = (): RateLimitMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as RateLimitMap;
    }
  } catch (_error) {
    // Ignore malformed storage values and reset cache in memory.
  }

  return {};
};

const persistRateLimitMap = (map: RateLimitMap) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(map));
  } catch (_error) {
    // Ignore storage write failures (private mode/quota limits).
  }
};

let rateLimitUntilByBucket: RateLimitMap = readRateLimitMap();
let cachedClientId: string | null = null;

const getOrCreateClientId = (): string => {
  if (cachedClientId) {
    return cachedClientId;
  }

  if (typeof window === 'undefined') {
    cachedClientId = 'server-runtime';
    return cachedClientId;
  }

  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      cachedClientId = existing.trim();
      return cachedClientId;
    }
  } catch (_error) {
    // Ignore storage read errors and generate a runtime id.
  }

  const generated =
    window.crypto?.randomUUID?.() ||
    `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  cachedClientId = generated;

  try {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
  } catch (_error) {
    // Ignore storage write failures.
  }

  return generated;
};

const getRemainingCooldownMs = (bucket: string): number => {
  const now = Date.now();
  const bucketUntil = rateLimitUntilByBucket[bucket] || 0;
  const globalUntil = rateLimitUntilByBucket.global || 0;
  const effectiveUntil = Math.max(bucketUntil, globalUntil);
  return effectiveUntil > now ? effectiveUntil - now : 0;
};

const storeCooldown = (bucket: string, retryAfterMs: number) => {
  const until = Date.now() + retryAfterMs;
  rateLimitUntilByBucket[bucket] = until;

  const now = Date.now();
  Object.keys(rateLimitUntilByBucket).forEach((key) => {
    if (rateLimitUntilByBucket[key] <= now) {
      delete rateLimitUntilByBucket[key];
    }
  });

  persistRateLimitMap(rateLimitUntilByBucket);
};

export class ApiClient {
  /**
   * With httpOnly cookies, the client never touches the JWT directly.
   * Authentication is handled automatically by the browser sending cookies.
   * These methods are kept for backward compatibility.
   */
  setToken(_token: string | null) {
    // No-op: JWT is now in httpOnly cookie, managed by the server.
    // Clear legacy storage if present
    try {
      sessionStorage.removeItem('chrono_token');
      localStorage.removeItem('chrono_token');
    } catch (_e) { /* ignore */ }
  }

  getToken(): string | null {
    // Cannot read httpOnly cookie from JS (by design).
    // Return a sentinel if csrf_token cookie exists (set alongside auth cookie)
    return getCookie('csrf_token') ? '__httpOnly__' : null;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const rateLimitBucket = getRateLimitBucket(method, endpoint);
    const remainingCooldownMs = getRemainingCooldownMs(rateLimitBucket);

    if (remainingCooldownMs > 0) {
      return {
        error: 'rateLimitError',
        retryAfter: remainingCooldownMs,
        status: 429,
      };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    headers['X-Client-Id'] = getOrCreateClientId();

    // No Authorization header needed — httpOnly cookie is sent automatically via credentials: 'include'

    // CSRF Protection: attach token from cookie to header on mutation requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }
    // API Key management moved server-side for security
    // Frontend never holds sensitive credentials
    // if (apiKey) {
    //   headers['X-API-Key'] = apiKey;
    // }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Send cookies with every request (CSRF + future httpOnly JWT)
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const waitTime = parseRetryAfterMs(response.headers.get('Retry-After'));
          console.warn(`Rate limited (429). Server suggests waiting ${waitTime}ms`);
          storeCooldown(rateLimitBucket, waitTime);
          return { error: 'rateLimitError', retryAfter: waitTime, status: 429 };
        }
        const errBody = await response.json().catch(() => ({}));
        const errorMessage = errBody.error || errBody.details || errBody.message || `Request failed with status ${response.status}`;
        // Never populate `data` on error responses — callers checking `result.data`
        // must not mistake an error payload for valid data (avoids auth loops on 401).
        return { error: errorMessage, status: response.status, errorData: errBody };
      }

      const text = await response.text();
      const data: T = text ? JSON.parse(text) : ({} as T);
      return { data };
    } catch (error: any) {
      if (error.name === 'AbortError') {
         return { error: 'Tempo limite de conexão excedido. O servidor pode estar indisponível.' };
      }
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        return { error: `Não foi possível conectar ao servidor. Verifique se o backend está rodando.` };
      }
      return { error: error.message || 'Erro de rede' };
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const baseClient = new ApiClient();
export const apiClient = baseClient;
