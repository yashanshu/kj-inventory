// Authentication service

import { apiClient } from './api';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '../types/inventory';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.token) {
      apiClient.setToken(response.token);
    }
    return response;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.token) {
      apiClient.setToken(response.token);
    }
    return response;
  },

  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/profile');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiClient.post<void>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  logout() {
    apiClient.setToken(null);
  },

  getToken(): string | null {
    return apiClient.getToken();
  },

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  },
};
