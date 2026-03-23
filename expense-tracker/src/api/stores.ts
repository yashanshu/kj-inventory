import { apiClient } from './client';
import type { Store } from '../types/ledgr';

// Calls the Ledgr-owned stores endpoint — works in combined and standalone deployment.
export async function listStores(): Promise<Store[]> {
  const res = await apiClient.get<Store[]>('/api/v1/ledgr/stores');
  return res.data;
}
