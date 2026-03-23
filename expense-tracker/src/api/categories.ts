import { apiClient } from './client';
import type { Category } from '../types/ledgr';

const BASE = '/api/v1/ledgr/categories';

export async function listCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>(BASE);
  return res.data;
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const res = await apiClient.post<Category>(BASE, data);
  return res.data;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const res = await apiClient.put<Category>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
