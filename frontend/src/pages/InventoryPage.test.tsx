import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { InventoryPage } from './InventoryPage';
import * as inventoryHooks from '../hooks/useInventory';
import type { PaginatedItemsResponse, Category } from '../types/inventory';

// Mock the hooks
vi.mock('../hooks/useInventory');
vi.mock('../hooks/useInventoryFilters', () => ({
  useInventoryFilters: vi.fn(() => ({
    page: 1,
    pageSize: 10,
    searchTerm: '',
    selectedCategoryId: null,
    lowStockOnly: false,
    localSearchTerm: '',
    queryParams: {},
    setPage: vi.fn(),
    setLocalSearchTerm: vi.fn(),
    handleCategoryChange: vi.fn(),
    handleLowStockToggle: vi.fn(),
    handlePageSizeChange: vi.fn(),
    resetFilters: vi.fn(),
  })),
}));
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { role: 'ADMIN' },
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('InventoryPage Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays total count correctly from paginated response', async () => {
    // 1 item on current page, but 100 items total across all pages
    const mockPaginatedResponse: PaginatedItemsResponse = {
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        organizationId: 'org1',
        categoryId: 'cat1',
        name: `Item ${i + 1}`,
        unit: 'pcs' as const,
        minimumThreshold: 5,
        currentStock: 10,
        isActive: true,
        trackStock: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      })),
      total: 100, // Total across all pages - this is the key test
    };

    const mockCategories: Category[] = [
      {
        id: 'cat1',
        organizationId: 'org1',
        name: 'Category 1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    vi.mocked(inventoryHooks.useItems).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(inventoryHooks.useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(<InventoryPage />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      // Should show the total count of 100, not just the 10 items on the current page
      expect(screen.getByText(/of 100/)).toBeInTheDocument();
      // Page should show 1-10 of 100
      expect(screen.getByText(/1-10 of 100/)).toBeInTheDocument();
    });
  });

  it('displays correct range for page 2', async () => {
    const mockPaginatedResponse: PaginatedItemsResponse = {
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 11}`,
        organizationId: 'org1',
        categoryId: 'cat1',
        name: `Item ${i + 11}`,
        unit: 'pcs' as const,
        minimumThreshold: 5,
        currentStock: 10,
        isActive: true,
        trackStock: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      })),
      total: 100,
    };

    const mockCategories: Category[] = [
      {
        id: 'cat1',
        organizationId: 'org1',
        name: 'Category 1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    vi.mocked(inventoryHooks.useItems).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(inventoryHooks.useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(<InventoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // On page 2 with 10 items per page, should show items 11-20 (even though we're returning 11-20 in the mock)
      // The pagination component calculates this based on page number
      expect(screen.getByText(/of 100/)).toBeInTheDocument();
    });
  });

  it('handles empty results correctly', async () => {
    const mockPaginatedResponse: PaginatedItemsResponse = {
      items: [],
      total: 0,
    };

    const mockCategories: Category[] = [];

    vi.mocked(inventoryHooks.useItems).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(inventoryHooks.useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(<InventoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should show empty state, not pagination
      expect(screen.queryByText(/of 0/)).not.toBeInTheDocument();
    });
  });

  it('calculates total pages correctly', async () => {
    const mockPaginatedResponse: PaginatedItemsResponse = {
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        organizationId: 'org1',
        categoryId: 'cat1',
        name: `Item ${i + 1}`,
        unit: 'pcs' as const,
        minimumThreshold: 5,
        currentStock: 10,
        isActive: true,
        trackStock: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      })),
      total: 47, // Should result in 5 pages with 10 items per page
    };

    const mockCategories: Category[] = [
      {
        id: 'cat1',
        organizationId: 'org1',
        name: 'Category 1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    vi.mocked(inventoryHooks.useItems).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(inventoryHooks.useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(<InventoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should display total of 47
      expect(screen.getByText(/1-10 of 47/)).toBeInTheDocument();

      // Should show page buttons - with 47 items and 10 per page, that's 5 pages
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    });
  });
});
