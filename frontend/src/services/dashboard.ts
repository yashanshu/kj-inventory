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
    return apiClient.get<DashboardMetrics>('/dashboard/metrics');
  },

  async getRecentMovements(limit?: number): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>('/dashboard/recent-movements', {
      limit: limit || 10,
    });
  },

  async getStockTrends(days?: number): Promise<StockTrend[]> {
    return apiClient.get<StockTrend[]>('/dashboard/stock-trends', {
      days: days || 7,
    });
  },

  async getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
    return apiClient.get<CategoryBreakdown[]>('/dashboard/category-breakdown');
  },

  async getLowStockItems(): Promise<Item[]> {
    return apiClient.get<Item[]>('/dashboard/low-stock');
  },

  async getAlerts(isRead?: boolean): Promise<Alert[]> {
    return apiClient.get<Alert[]>('/dashboard/alerts', {
      ...(isRead !== undefined && { isRead }),
    });
  },
};
