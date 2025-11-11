import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetStockAdjust } from './BottomSheetStockAdjust';
import type { Item } from '../../types/inventory';

// Mock the useCreateMovement hook
vi.mock('../../hooks/useInventory', () => ({
  useCreateMovement: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockItem: Item = {
  id: 'item-1',
  organizationId: 'org-1',
  categoryId: 'cat-1',
  name: 'Test Item',
  unit: 'pcs',
  minimumThreshold: 10,
  currentStock: 100,
  isActive: true,
  trackStock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('BottomSheetStockAdjust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stock Preview Calculation', () => {
    it('should show correct preview for IN movement type', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select IN movement type
      const stockInButton = screen.getByRole('button', { name: /stock in/i });
      fireEvent.click(stockInButton);

      // Enter quantity
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '50' } });

      // Preview should show currentStock + quantity = 100 + 50 = 150
      await waitFor(() => {
        expect(screen.getByText(/new stock will be:/i)).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should show correct preview for OUT movement type', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select OUT movement type
      const stockOutButton = screen.getByRole('button', { name: /stock out/i });
      fireEvent.click(stockOutButton);

      // Enter quantity
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '30' } });

      // Preview should show currentStock - quantity = 100 - 30 = 70
      await waitFor(() => {
        expect(screen.getByText(/new stock will be:/i)).toBeInTheDocument();
        expect(screen.getByText('70')).toBeInTheDocument();
      });
    });

    it('should show correct preview for ADJUSTMENT movement type - sets exact value', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select ADJUSTMENT movement type
      const adjustButton = screen.getByRole('button', { name: /^adjust$/i });
      fireEvent.click(adjustButton);

      // Enter quantity - this should be the EXACT new stock value, not a delta
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '50' } });

      // Preview should show the exact quantity entered = 50 (NOT 100 + 50 = 150)
      await waitFor(() => {
        expect(screen.getByText(/new stock will be:/i)).toBeInTheDocument();
        // Should show 50, not 150
        const stockDisplay = screen.getAllByText('50').find(el =>
          el.closest('.bg-gray-50.rounded-xl')
        );
        expect(stockDisplay).toBeInTheDocument();
      });
    });

    it('should allow setting stock to 0 with ADJUSTMENT type', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select ADJUSTMENT movement type
      const adjustButton = screen.getByRole('button', { name: /^adjust$/i });
      fireEvent.click(adjustButton);

      // Enter 0 as quantity
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '0' } });

      // Preview should show 0
      await waitFor(() => {
        expect(screen.getByText(/new stock will be:/i)).toBeInTheDocument();
        const stockDisplay = screen.getAllByText('0').find(el =>
          el.closest('.bg-gray-50.rounded-xl')
        );
        expect(stockDisplay).toBeInTheDocument();
      });

      // Submit button should not be disabled for 0 with ADJUSTMENT
      const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should prevent submitting 0 with IN movement type', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select IN movement type (default)
      const stockInButton = screen.getByRole('button', { name: /stock in/i });
      fireEvent.click(stockInButton);

      // Enter 0 as quantity
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '0' } });

      // Submit button should be disabled for 0 with IN type
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should prevent submitting 0 with OUT movement type', async () => {
      const onClose = vi.fn();
      render(
        <BottomSheetStockAdjust item={mockItem} open={true} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      // Select OUT movement type
      const stockOutButton = screen.getByRole('button', { name: /stock out/i });
      fireEvent.click(stockOutButton);

      // Enter 0 as quantity
      const quantityInput = screen.getByPlaceholderText('0');
      fireEvent.change(quantityInput, { target: { value: '0' } });

      // Submit button should be disabled for 0 with OUT type
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
