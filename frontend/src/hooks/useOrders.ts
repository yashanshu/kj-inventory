// React Query hook for orders

import { useQuery } from '@tanstack/react-query';
import { ordersService, type OrderFilters, type Order, type OrderStats } from '../services/orders';

export function useOrders(filters: OrderFilters = {}) {
    return useQuery<Order[]>({
        queryKey: ['orders', filters],
        queryFn: () => ordersService.getOrders(filters),
    });
}

export function useOrderStats(startDate?: string, endDate?: string) {
    return useQuery<OrderStats>({
        queryKey: ['orderStats', startDate, endDate],
        queryFn: () => ordersService.getOrderStats(startDate, endDate),
    });
}
