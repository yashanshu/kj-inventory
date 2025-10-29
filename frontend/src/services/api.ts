// API client with authentication support

import type { ApiSuccessResponse } from '../types/api';
import { isApiError } from '../types/api';

const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:8800' : '/api/v1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;

export class ApiError extends Error {
  public code: string;
  public details?: any;

  constructor(
    message: string,
    code: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on init
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (isApiError(data)) {
          throw new ApiError(
            data.error.message,
            data.error.code,
            data.error.details
          );
        }
        throw new ApiError(
          response.statusText || 'Request failed',
          'UNKNOWN_ERROR'
        );
      }

      // Backend returns {data: ...} wrapper
      if (data && 'data' in data) {
        return (data as ApiSuccessResponse<T>).data;
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message, 'NETWORK_ERROR');
      }
      throw new ApiError('An unknown error occurred', 'UNKNOWN_ERROR');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let queryString = '';
    if (params) {
      // Filter out undefined/null values to avoid sending them as strings
      const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>);

      const urlParams = new URLSearchParams(filteredParams);
      if (urlParams.toString()) {
        queryString = '?' + urlParams.toString();
      }
    }
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
