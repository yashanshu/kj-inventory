// React Query hook for orders

import { useQuery } from '@tanstack/react-query';
import { ordersService, type OrderFilters, type Order, type OrderStats } from '../services/orders';
import { useStoreFilterStore } from '../store/storeFilterStore';

export function useOrders(filters: OrderFilters = {}) {
    const selectedStoreId = useStoreFilterStore(s => s.selectedStoreId);
    const effectiveFilters = { ...filters, storeId: selectedStoreId ?? undefined };
    return useQuery<Order[]>({
        queryKey: ['orders', effectiveFilters],
        queryFn: () => ordersService.getOrders(effectiveFilters),
    });
}

export function useOrderStats(startDate?: string, endDate?: string) {
    return useQuery<OrderStats>({
        queryKey: ['orderStats', startDate, endDate],
        queryFn: () => ordersService.getOrderStats(startDate, endDate),
    });
}
