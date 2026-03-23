import { apiClient } from './client';
import type { Expense, CalendarSummary } from '../types/ledgr';

const BASE = '/api/v1/ledgr/expenses';

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
}

export interface ExpenseFilters {
  date_from?: string;
  date_to?: string;
  category_id?: string;
  funding_source?: string;
  payment_method?: string;
  store_id?: string;
  entry_type?: string;
  page?: number;
  per_page?: number;
}

export async function listExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResponse> {
  const res = await apiClient.get<ExpenseListResponse>(BASE, { params: filters });
  return res.data;
}

export async function getExpense(id: string): Promise<Expense> {
  const res = await apiClient.get<Expense>(`${BASE}/${id}`);
  return res.data;
}

export async function createExpense(data: Partial<Expense>): Promise<Expense> {
  const res = await apiClient.post<Expense>(BASE, data);
  return res.data;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  const res = await apiClient.put<Expense>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getCalendarSummary(year: number, month: number): Promise<CalendarSummary> {
  const res = await apiClient.get<CalendarSummary>(`${BASE}/calendar/${year}/${month}`);
  return res.data;
}
