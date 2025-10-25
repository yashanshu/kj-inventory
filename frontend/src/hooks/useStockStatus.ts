import { useMemo } from 'react';
import type { Item } from '../types/inventory';

export interface StockStatus {
  label: string;
  color: string;
  severity: 'critical' | 'warning' | 'ok';
}

export function useStockStatus(item: Item): StockStatus {
  return useMemo(() => {
    if (item.trackStock === false) {
      return {
        label: 'Not Tracked',
        color: 'bg-gray-100 text-gray-600',
        severity: 'ok',
      };
    }
    if (item.currentStock === 0) {
      return {
        label: 'Out of Stock',
        color: 'bg-red-100 text-red-800',
        severity: 'critical',
      };
    }
    if (item.currentStock <= item.minimumThreshold) {
      return {
        label: 'Low Stock',
        color: 'bg-yellow-100 text-yellow-800',
        severity: 'warning',
      };
    }
    return {
      label: 'In Stock',
      color: 'bg-green-100 text-green-800',
      severity: 'ok',
    };
  }, [item.trackStock, item.currentStock, item.minimumThreshold]);
}
