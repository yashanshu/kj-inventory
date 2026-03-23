/** Returns today's date in YYYY-MM-DD format (local time). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the first day of the given month as YYYY-MM-DD. */
export function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Formats a YYYY-MM-DD date string as a human-readable label (e.g. "18 Mar 2026"). */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date + 'T00:00:00'));
}

/** Returns the number of days in the given month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
