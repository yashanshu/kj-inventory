import { apiClient } from './api';
import type { Store, PlatformBinding } from '../types/inventory';

export const storesService = {
  getStores: () => apiClient.get<Store[]>('/stores'),
  createStore: (data: { name: string; code: string; isPrimary?: boolean }) =>
    apiClient.post<Store>('/stores', data),
  updateStore: (id: string, data: { name?: string; code?: string; isPrimary?: boolean }) =>
    apiClient.put<Store>(`/stores/${id}`, data),
  deleteStore: (id: string) => apiClient.delete<void>(`/stores/${id}`),

  getBindings: (storeId?: string) =>
    apiClient.get<PlatformBinding[]>('/platform-bindings', storeId ? { store_id: storeId } : undefined),
  createBinding: (data: { storeId: string; platform: string; restaurantId: string; restaurantName?: string }) =>
    apiClient.post<PlatformBinding>('/platform-bindings', data),
  updateBinding: (id: string, data: { restaurantName?: string; isActive?: boolean }) =>
    apiClient.put<PlatformBinding>(`/platform-bindings/${id}`, data),
  deleteBinding: (id: string) => apiClient.delete<void>(`/platform-bindings/${id}`),
};
