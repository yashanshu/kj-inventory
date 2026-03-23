import { apiClient } from './client';
import type { PLReport, GSTSummary } from '../types/ledgr';

const BASE = '/api/v1/ledgr/reports';

export async function getPLReport(from?: string, to?: string): Promise<PLReport> {
  const res = await apiClient.get<PLReport>(`${BASE}/pl`, { params: { from, to } });
  return res.data;
}

export async function getGSTSummary(from?: string, to?: string): Promise<GSTSummary> {
  const res = await apiClient.get<GSTSummary>(`${BASE}/gst`, { params: { from, to } });
  return res.data;
}

export async function getPartnerReport(from?: string, to?: string) {
  const res = await apiClient.get(`${BASE}/partners`, { params: { from, to } });
  return res.data;
}
