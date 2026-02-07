import { baseClient } from './client';

// Type-safe authentication interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  captchaVerified?: boolean;
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
    return baseClient.request<{ success: boolean }>(`/auth/verify-email?token=${token}`, {
      method: 'GET',
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return baseClient.request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

