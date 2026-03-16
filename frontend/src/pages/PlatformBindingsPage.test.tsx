import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformBindingsPage } from './PlatformBindingsPage';

vi.mock('../hooks/useStores', () => ({
  useBindings: vi.fn(),
  useStores: vi.fn(),
  useCreateBinding: vi.fn(),
  useUpdateBinding: vi.fn(),
  useDeleteBinding: vi.fn(),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useBindings, useStores, useCreateBinding, useUpdateBinding, useDeleteBinding } from '../hooks/useStores';
import { useAuthStore } from '../store/authStore';

describe('PlatformBindingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useBindings).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useStores).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useCreateBinding).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useUpdateBinding).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDeleteBinding).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('redirects non-admin users to the home page', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { role: 'STAFF' },
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin/bindings']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/admin/bindings" element={<PlatformBindingsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Platform Bindings')).not.toBeInTheDocument();
  });

  it('renders the bindings page for admin users', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { role: 'ADMIN' },
    } as any);

    render(
      <MemoryRouter>
        <PlatformBindingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Platform Bindings')).toBeInTheDocument();
    expect(screen.getByText('No bindings yet')).toBeInTheDocument();
  });
});
