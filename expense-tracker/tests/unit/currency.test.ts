import { describe, it, expect } from 'vitest';
import { formatINR, rupeesToPaise, paiseToRupees } from '../../src/utils/currency';

describe('currency utils', () => {
  it('formatINR formats correctly', () => {
    // ₹2,450.00
    const result = formatINR(245000);
    expect(result).toContain('2,450');
  });

  it('rupeesToPaise converts string to integer paise', () => {
    expect(rupeesToPaise('100')).toBe(10000);
    expect(rupeesToPaise('100.50')).toBe(10050);
    expect(rupeesToPaise('')).toBe(0);
    expect(rupeesToPaise('abc')).toBe(0);
  });

  it('paiseToRupees formats with 2 decimal places', () => {
    expect(paiseToRupees(10000)).toBe('100.00');
    expect(paiseToRupees(10050)).toBe('100.50');
  });
});
