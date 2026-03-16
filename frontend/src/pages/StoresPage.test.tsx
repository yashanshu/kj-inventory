import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoresPage } from './StoresPage';

vi.mock('../hooks/useStores', () => ({
  useStores: vi.fn(),
  useCreateStore: vi.fn(),
  useUpdateStore: vi.fn(),
  useDeleteStore: vi.fn(),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useStores, useCreateStore, useUpdateStore, useDeleteStore } from '../hooks/useStores';
import { useAuthStore } from '../store/authStore';

describe('StoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useStores).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useCreateStore).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useUpdateStore).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDeleteStore).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('redirects non-admin users to the home page', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { role: 'STAFF' },
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin/stores']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/admin/stores" element={<StoresPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Stores')).not.toBeInTheDocument();
  });

  it('renders the stores page for admin users', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { role: 'ADMIN' },
    } as any);

    render(
      <MemoryRouter>
        <StoresPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Stores')).toBeInTheDocument();
    expect(screen.getByText('No stores yet')).toBeInTheDocument();
  });
});
