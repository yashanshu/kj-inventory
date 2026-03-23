import { apiClient } from './client';
import type { PartnerBalance, Expense } from '../types/ledgr';

export async function getPartnerBalances(): Promise<{ balances: PartnerBalance[] }> {
  const res = await apiClient.get<{ balances: PartnerBalance[] }>('/api/v1/ledgr/partners/balances');
  return res.data;
}

export async function createSettlement(data: Partial<Expense>): Promise<Expense> {
  const res = await apiClient.post<Expense>('/api/v1/ledgr/settlements', data);
  return res.data;
}
