// TypeScript types matching Go domain types in backend/internal/ledgr/domain/

export type FundingSource = 'personal' | 'partner2' | 'partner3' | 'payout' | 'loan';
export type PaymentMethod = 'upi' | 'card' | 'cash' | 'neft' | 'other';
export type GSTRate = '0' | '5' | '12' | '18' | '28';
export type EntryType = 'expense' | 'salary' | 'settlement';
export type DayState = 'draft' | 'pending_review' | 'locked' | 'has_entries' | 'empty' | 'future';

export interface Expense {
  id: string;
  org_id: string;
  store_id?: string;
  date: string; // YYYY-MM-DD
  amount_paise: number;
  base_paise: number;
  gst_rate: GSTRate;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  gst_inclusive: boolean;
  is_interstate: boolean;
  category_id: string;
  funding_source: FundingSource;
  payment_method: PaymentMethod;
  vendor_name?: string;
  vendor_gstin?: string;
  invoice_number?: string;
  has_invoice: boolean;
  entry_type: EntryType;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  salary_details?: SalaryDetails;
  attachments?: Attachment[];
}

export interface SalaryDetails {
  id: string;
  expense_id: string;
  employee_name: string;
  gross_paise: number;
  net_paise: number;
  deductions: SalaryDeduction[];
  created_at: string;
}

export interface SalaryDeduction {
  id: string;
  salary_id: string;
  deduction_type: 'leave' | 'advance' | 'other';
  deduction_label?: string;
  amount_paise: number;
}

export interface Attachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_type: 'image' | 'pdf' | 'screenshot';
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Category {
  id: string;
  org_id: string;
  name: string;
  sort_order: number;
  is_hidden: boolean;
  is_system: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  org_id: string;
  name: string;
  category_id: string;
  amount_paise?: number;
  funding_source: FundingSource;
  payment_method: PaymentMethod;
  gst_rate: GSTRate;
  gst_inclusive: boolean;
  store_id?: string;
  description?: string;
  sort_order: number;
  created_at: string;
}

export interface DayLog {
  id: string;
  org_id: string;
  date: string;
  state: 'draft' | 'pending_review' | 'locked';
  locked_by?: string;
  locked_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarDay {
  date: string;
  state: DayState;
  entry_count: number;
  total_paise: number;
  base_paise: number;
  gst_paise: number;
}

export interface WeekTotal {
  week_number: number;
  total_paise: number;
}

export interface CalendarSummary {
  year: number;
  month: number;
  days: CalendarDay[];
  week_totals: WeekTotal[];
  month_total_paise: number;
}

export interface PartnerBalance {
  funding_source: FundingSource;
  total_spent_paise: number;
  total_settled_paise: number;
  net_owed_paise: number;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  is_primary: boolean;
}

export interface PLReport {
  date_from: string;
  date_to: string;
  total_paise: number;
  total_gst_paise: number;
  net_paise: number;
  by_category: { category_id: string; category_name: string; total_paise: number; entry_count: number }[];
  by_funding_source: { funding_source: FundingSource; total_paise: number }[];
}

export interface GSTRow {
  gst_rate: GSTRate;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_gst_paise: number;
}

export interface GSTSummary {
  date_from: string;
  date_to: string;
  rows: GSTRow[];
  totals: Omit<GSTRow, 'gst_rate'>;
}
