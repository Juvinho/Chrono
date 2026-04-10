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
}

let globalRateLimitUntil = 0;

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
    const now = Date.now();
    if (now < globalRateLimitUntil) {
      return { error: 'rateLimitError', retryAfter: globalRateLimitUntil - now };
    }
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // No Authorization header needed — httpOnly cookie is sent automatically via credentials: 'include'

    // CSRF Protection: attach token from cookie to header on mutation requests
    const method = (options.method || 'GET').toUpperCase();
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
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.warn(`Rate limited (429). Server suggests waiting ${waitTime}ms`);
          globalRateLimitUntil = Date.now() + waitTime;
          return { error: 'rateLimitError', retryAfter: waitTime, status: 429 };
        }
        const errBody = await response.json().catch(() => ({}));
        const errorMessage = errBody.error || errBody.details || errBody.message || `Request failed with status ${response.status}`;
        // Never populate `data` on error responses — callers checking `result.data`
        // must not mistake an error payload for valid data (avoids auth loops on 401).
        return { error: errorMessage, status: response.status };
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
