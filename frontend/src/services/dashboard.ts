// Dashboard service

import { apiClient } from './api';
import type {
  DashboardMetrics,
  StockMovement,
  StockTrend,
  CategoryBreakdown,
  Item,
  Alert,
} from '../types/inventory';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    return apiClient.get<DashboardMetrics>('/api/v1/dashboard/metrics');
  },

  async getRecentMovements(limit?: number): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>('/api/v1/dashboard/recent-movements', {
      limit: limit || 10,
    });
  },

  async getStockTrends(days?: number): Promise<StockTrend[]> {
    return apiClient.get<StockTrend[]>('/api/v1/dashboard/stock-trends', {
      days: days || 7,
    });
  },

  async getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
    return apiClient.get<CategoryBreakdown[]>('/api/v1/dashboard/category-breakdown');
  },

  async getLowStockItems(): Promise<Item[]> {
    return apiClient.get<Item[]>('/api/v1/dashboard/low-stock');
  },

  async getAlerts(isRead?: boolean): Promise<Alert[]> {
    return apiClient.get<Alert[]>('/api/v1/dashboard/alerts', {
      ...(isRead !== undefined && { isRead }),
    });
  },
};
