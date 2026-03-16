import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { OrdersPage } from './OrdersPage';
import * as ordersHooks from '../hooks/useOrders';
import type { Order, OrderStats } from '../services/orders';

// Mock the hooks
vi.mock('../hooks/useOrders');

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

const mockOrders: Order[] = [
    {
        id: 1,
        platform: 'swiggy',
        externalOrderId: 'SWG123456',
        orderDate: '2026-02-09T10:30:00Z',
        customerName: 'Test Customer',
        totalAmount: 450,
        status: 'delivered',
        itemsJson: '[{"name":"Butter Chicken","quantity":1,"price":350},{"name":"Naan","quantity":2,"price":50}]',
        createdAt: '2026-02-09T10:30:00Z',
    },
    {
        id: 2,
        platform: 'zomato',
        externalOrderId: 'ZOM789012',
        orderDate: '2026-02-09T11:00:00Z',
        customerName: 'Another Customer',
        totalAmount: 275,
        status: 'ordered',
        itemsJson: '[{"name":"Paneer Tikka","quantity":1,"price":275}]',
        createdAt: '2026-02-09T11:00:00Z',
    },
];

const mockStats: OrderStats = {
    totalOrders: 100,
    totalRevenue: 25000,
    swiggyOrders: 60,
    swiggyRevenue: 15000,
    zomatoOrders: 40,
    zomatoRevenue: 10000,
    startDate: '2026-01-09',
    endDate: '2026-02-09',
};

describe('OrdersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: undefined,
            isLoading: true,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: undefined,
            isLoading: true,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        expect(screen.getByText(/Loading orders/i)).toBeInTheDocument();
    });

    it('renders orders table with data', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/#WG123456/)).toBeInTheDocument();
            expect(screen.getByText(/#OM789012/)).toBeInTheDocument();

            // Check customer names
            expect(screen.getByText('Test Customer')).toBeInTheDocument();
            expect(screen.getByText('Another Customer')).toBeInTheDocument();

            // Check platform badges
            expect(screen.getByText('swiggy')).toBeInTheDocument();
            expect(screen.getByText('zomato')).toBeInTheDocument();
        });
    });

    it('displays stats cards correctly', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            // Total stats
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('₹25,000')).toBeInTheDocument();

            // Platform breakdown
            expect(screen.getByText('60 orders')).toBeInTheDocument();
            expect(screen.getByText('40 orders')).toBeInTheDocument();
        });
    });

    it('filters orders by search term', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        const searchInput = screen.getByPlaceholderText(/Search by customer or order ID/i);
        fireEvent.change(searchInput, { target: { value: 'Test Customer' } });

        await waitFor(() => {
            // Should show matching customer
            expect(screen.getByText('Test Customer')).toBeInTheDocument();
            // Should not show non-matching customer
            expect(screen.queryByText('Another Customer')).not.toBeInTheDocument();
        });
    });

    it('handles empty orders state', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('No orders found')).toBeInTheDocument();
        });
    });

    it('expands order row to show items', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Test Customer')).toBeInTheDocument();
        });

        // Click on the first order row to expand it
        const firstRow = screen.getByText('Test Customer').closest('tr');
        if (firstRow) {
            fireEvent.click(firstRow);
        }

        await waitFor(() => {
            // Should show item details
            expect(screen.getByText(/Butter Chicken/)).toBeInTheDocument();
            expect(screen.getByText(/Naan/)).toBeInTheDocument();
        });
    });

    it('changes platform filter', async () => {
        const mockRefetch = vi.fn();

        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: mockRefetch,
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        const platformSelect = screen.getByRole('combobox');
        fireEvent.change(platformSelect, { target: { value: 'swiggy' } });

        // The hook should be called with the new filter
        // This tests that the component correctly passes the platform filter
        await waitFor(() => {
            expect(ordersHooks.useOrders).toHaveBeenCalledWith(
                expect.objectContaining({ platform: 'swiggy' })
            );
        });
    });

    it('handles refresh button click', async () => {
        const mockRefetch = vi.fn();

        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: mockRefetch,
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);

        expect(mockRefetch).toHaveBeenCalled();
    });
});

describe('OrdersPage Pagination', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows pagination controls', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Previous')).toBeInTheDocument();
            expect(screen.getByText('Next')).toBeInTheDocument();
        });
    });

    it('disables Previous button on first page', async () => {
        vi.mocked(ordersHooks.useOrders).mockReturnValue({
            data: mockOrders,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn(),
        } as any);

        vi.mocked(ordersHooks.useOrderStats).mockReturnValue({
            data: mockStats,
            isLoading: false,
        } as any);

        render(<OrdersPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            const prevButton = screen.getByText('Previous');
            expect(prevButton).toBeDisabled();
        });
    });
});
