import { apiClient } from './client';
import type { Template } from '../types/ledgr';

const BASE = '/api/v1/ledgr/templates';

export async function listTemplates(): Promise<Template[]> {
  const res = await apiClient.get<Template[]>(BASE);
  return res.data;
}

export async function createTemplate(data: Partial<Template>): Promise<Template> {
  const res = await apiClient.post<Template>(BASE, data);
  return res.data;
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const res = await apiClient.put<Template>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
