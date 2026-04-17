import { baseClient } from './client';

// Type-safe authentication interfaces
export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  requires_2fa?: boolean;
  temp_token?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  captchaToken?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
  captchaToken?: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  is_verified?: boolean;
}

export interface CheckAvailabilityResponse {
  available: boolean;
  valid?: boolean;
  error?: string;
  suggestions?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  avatar?: string;
  bio?: string;
  [key: string]: any;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  username: string;
  newPassword: string;
}

export const authService = {
  async login(credentials: LoginRequest) {
    return baseClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(userData: RegisterRequest) {
    return baseClient.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    // Call server to clear httpOnly cookie
    await baseClient.request('/auth/logout', { method: 'POST' });
    baseClient.setToken(null);
    return { data: { success: true } };
  },

  async getMe() {
    return baseClient.request<User>('/auth/me');
  },

  async getCurrentUser() {
    return this.getMe();
  },

  async updateProfile(data: UpdateProfileRequest) {
    return baseClient.request<User>('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async checkUsername(username: string) {
    return baseClient.request<CheckAvailabilityResponse>('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async checkEmail(email: string) {
    return baseClient.request<CheckAvailabilityResponse>('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyEmail(token: string) {
    return baseClient.request<{ success: boolean; message: string }>(`/auth/email-verification/verify/${token}`, {
      method: 'GET',
    });
  },

  async resendVerification(email: string) {
    return baseClient.request<{ success: boolean; message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async forgotPassword(data: ForgotPasswordRequest) {
    return baseClient.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetPassword(data: ResetPasswordRequest) {
    return baseClient.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return baseClient.request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount(password: string) {
    return baseClient.request<{ success: boolean }>('/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },

  // ─── 2FA Methods ─────────────────────────────────────
  async get2FAStatus() {
    return baseClient.get<{ enabled: boolean }>('/auth/2fa/status');
  },

  async setup2FA() {
    return baseClient.post<{ qrCodeDataUrl: string; secret: string; otpauthUrl: string }>('/auth/2fa/setup', {});
  },

  async confirm2FA(secret: string, code: string) {
    return baseClient.post<{ success: boolean; recoveryCodes: string[] }>('/auth/2fa/confirm', { secret, code });
  },

  async disable2FA(password: string) {
    return baseClient.post<{ success: boolean }>('/auth/2fa/disable', { password });
  },

  async verify2FA(tempToken: string, code?: string, recoveryCode?: string) {
    return baseClient.request<LoginResponse>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken, code, recovery_code: recoveryCode }),
    });
  },
};

