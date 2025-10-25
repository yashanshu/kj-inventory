// React Query hooks for dashboard data

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
  recentMovements: (limit?: number) => [...dashboardKeys.all, 'recent-movements', limit] as const,
  stockTrends: (days?: number) => [...dashboardKeys.all, 'stock-trends', days] as const,
  categoryBreakdown: () => [...dashboardKeys.all, 'category-breakdown'] as const,
  lowStock: () => [...dashboardKeys.all, 'low-stock'] as const,
  alerts: (isRead?: boolean) => [...dashboardKeys.all, 'alerts', isRead] as const,
};

// Dashboard hooks
export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: () => dashboardService.getMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRecentMovements(limit?: number) {
  return useQuery({
    queryKey: dashboardKeys.recentMovements(limit),
    queryFn: () => dashboardService.getRecentMovements(limit),
  });
}

export function useStockTrends(days?: number) {
  return useQuery({
    queryKey: dashboardKeys.stockTrends(days),
    queryFn: () => dashboardService.getStockTrends(days),
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: dashboardKeys.categoryBreakdown(),
    queryFn: () => dashboardService.getCategoryBreakdown(),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: dashboardKeys.lowStock(),
    queryFn: () => dashboardService.getLowStockItems(),
  });
}

export function useAlerts(isRead?: boolean) {
  return useQuery({
    queryKey: dashboardKeys.alerts(isRead),
    queryFn: () => dashboardService.getAlerts(isRead),
  });
}
