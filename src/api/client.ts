// src/api/client.ts
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
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
}

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('chrono_token', token);
    } else {
      localStorage.removeItem('chrono_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('chrono_token');
    }
    return this.token;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.warn(`Rate limited (429). Waiting ${waitTime}ms before retry...`);
          return { error: 'rateLimitError', retryAfter: waitTime };
        }
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || data.details || `Request failed with status ${response.status}`;
        return { error: errorMessage };
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
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
}

export const baseClient = new ApiClient();
