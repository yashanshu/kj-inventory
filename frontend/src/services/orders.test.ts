import { describe, it, expect, vi } from 'vitest';
import { ordersService, type Order, type OrderStats } from './orders';
import { apiClient } from './api';

// Mock the API client
vi.mock('./api', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

describe('ordersService', () => {
    describe('getOrders', () => {
        it('fetches orders without filters', async () => {
            const mockOrders: Order[] = [
                {
                    id: 1,
                    platform: 'swiggy',
                    externalOrderId: 'SWG123',
                    orderDate: '2026-02-09T10:00:00Z',
                    totalAmount: 500,
                    status: 'delivered',
                    createdAt: '2026-02-09T10:00:00Z',
                },
            ];

            vi.mocked(apiClient.get).mockResolvedValue(mockOrders);

            const result = await ordersService.getOrders();

            expect(apiClient.get).toHaveBeenCalledWith('/orders', {});
            expect(result).toEqual(mockOrders);
        });

        it('fetches orders with platform filter', async () => {
            vi.mocked(apiClient.get).mockResolvedValue([]);

            await ordersService.getOrders({ platform: 'swiggy' });

            expect(apiClient.get).toHaveBeenCalledWith('/orders', { platform: 'swiggy' });
        });

        it('fetches orders with pagination', async () => {
            vi.mocked(apiClient.get).mockResolvedValue([]);

            await ordersService.getOrders({ limit: 25, offset: 50 });

            expect(apiClient.get).toHaveBeenCalledWith('/orders', { limit: 25, offset: 50 });
        });

        it('fetches orders with date range', async () => {
            vi.mocked(apiClient.get).mockResolvedValue([]);

            await ordersService.getOrders({ startDate: '2026-01-01', endDate: '2026-02-01' });

            expect(apiClient.get).toHaveBeenCalledWith('/orders', {
                startDate: '2026-01-01',
                endDate: '2026-02-01',
            });
        });
    });

    describe('getOrderStats', () => {
        it('fetches stats without date range', async () => {
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

            vi.mocked(apiClient.get).mockResolvedValue(mockStats);

            const result = await ordersService.getOrderStats();

            expect(apiClient.get).toHaveBeenCalledWith('/orders/stats', {});
            expect(result).toEqual(mockStats);
        });

        it('fetches stats with custom date range', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({});

            await ordersService.getOrderStats('2026-01-01', '2026-02-01');

            expect(apiClient.get).toHaveBeenCalledWith('/orders/stats', {
                startDate: '2026-01-01',
                endDate: '2026-02-01',
            });
        });
    });

    describe('parseItems', () => {
        it('parses valid items JSON', () => {
            const itemsJson = '[{"name":"Butter Chicken","quantity":2,"price":350}]';

            const result = ordersService.parseItems(itemsJson);

            expect(result).toEqual([{ name: 'Butter Chicken', quantity: 2, price: 350 }]);
        });

        it('returns empty array for undefined', () => {
            const result = ordersService.parseItems(undefined);

            expect(result).toEqual([]);
        });

        it('returns empty array for invalid JSON', () => {
            const result = ordersService.parseItems('not valid json');

            expect(result).toEqual([]);
        });

        it('parses multiple items', () => {
            const itemsJson = '[{"name":"Item 1","quantity":1,"price":100},{"name":"Item 2","quantity":2,"price":200}]';

            const result = ordersService.parseItems(itemsJson);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Item 1');
            expect(result[1].name).toBe('Item 2');
        });
    });
});
