import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/auth', () => ({
  authService: {
    isAuthenticated: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authService } from '../services/auth';
import { useAuthStore } from './authStore';

describe('useAuthStore.checkAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('clears auth state when fetching the profile fails', async () => {
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    vi.mocked(authService.getProfile).mockRejectedValue(new Error('request failed'));

    useAuthStore.setState({
      user: {
        id: 'user-1',
        organizationId: 'org-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: 'stale error',
    });

    await useAuthStore.getState().checkAuth();

    expect(authService.logout).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });
});
