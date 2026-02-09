// Orders service for fetching order data from API

import { apiClient } from './api';

export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: number;
    platform: 'swiggy' | 'zomato';
    externalOrderId: string;
    orderDate: string;
    customerName?: string;
    totalAmount: number;
    status: string;
    itemsJson?: string;
    createdAt: string;
}

export interface OrderStats {
    totalOrders: number;
    totalRevenue: number;
    swiggyOrders: number;
    swiggyRevenue: number;
    zomatoOrders: number;
    zomatoRevenue: number;
    startDate: string;
    endDate: string;
}

export interface OrderFilters {
    platform?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export const ordersService = {
    async getOrders(filters: OrderFilters = {}): Promise<Order[]> {
        const params: Record<string, any> = {};
        if (filters.platform) params.platform = filters.platform;
        if (filters.limit) params.limit = filters.limit;
        if (filters.offset) params.offset = filters.offset;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;

        return apiClient.get<Order[]>('/orders', params);
    },

    async getOrderStats(startDate?: string, endDate?: string): Promise<OrderStats> {
        const params: Record<string, any> = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        return apiClient.get<OrderStats>('/orders/stats', params);
    },

    // Parse items from JSON string
    parseItems(itemsJson?: string): OrderItem[] {
        if (!itemsJson) return [];
        try {
            return JSON.parse(itemsJson);
        } catch {
            return [];
        }
    }
};
