import { apiClient } from './client';
import type { DayLog } from '../types/ledgr';

const BASE = '/api/v1/ledgr/daylog';

export async function getDayLog(date: string): Promise<DayLog> {
  const res = await apiClient.get<DayLog>(`${BASE}/${date}`);
  return res.data;
}

export async function submitDay(date: string): Promise<DayLog> {
  const res = await apiClient.post<DayLog>(`${BASE}/${date}/submit`);
  return res.data;
}

export async function lockDay(date: string): Promise<DayLog> {
  const res = await apiClient.post<DayLog>(`${BASE}/${date}/lock`);
  return res.data;
}

export async function unlockDay(date: string): Promise<DayLog> {
  const res = await apiClient.post<DayLog>(`${BASE}/${date}/unlock`);
  return res.data;
}
