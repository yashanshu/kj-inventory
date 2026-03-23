/**
 * Formats paise (integer) as a human-readable INR string.
 * e.g. 245000 → "₹2,450.00"
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

/** Converts rupees string (e.g. "1234.50") to paise integer. */
export function rupeesToPaise(rupees: string): number {
  const n = parseFloat(rupees);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Converts paise integer to rupees string for display in inputs. */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}
