import { describe, it, expect } from 'vitest';
import { computeGST } from '../../src/utils/gst';

describe('computeGST', () => {
  it('rate 0 returns amount unchanged', () => {
    const r = computeGST(10000, 0, true, false);
    expect(r.basePaise).toBe(10000);
    expect(r.gstPaise).toBe(0);
    expect(r.totalPaise).toBe(10000);
  });

  it('18% inclusive intrastate splits correctly', () => {
    // ₹118 inclusive at 18% → base = ₹100, gst = ₹18, cgst = ₹9, sgst = ₹9
    const r = computeGST(11800, 18, true, false);
    expect(r.basePaise).toBe(10000);
    expect(r.gstPaise).toBe(1800);
    expect(r.cgstPaise).toBe(900);
    expect(r.sgstPaise).toBe(900);
    expect(r.igstPaise).toBe(0);
    expect(r.totalPaise).toBe(11800);
  });

  it('18% exclusive intrastate', () => {
    const r = computeGST(10000, 18, false, false);
    expect(r.basePaise).toBe(10000);
    expect(r.gstPaise).toBe(1800);
    expect(r.totalPaise).toBe(11800);
  });

  it('18% exclusive interstate applies IGST', () => {
    const r = computeGST(10000, 18, false, true);
    expect(r.igstPaise).toBe(1800);
    expect(r.cgstPaise).toBe(0);
    expect(r.sgstPaise).toBe(0);
  });

  it('5% inclusive rounding is consistent', () => {
    // ₹105 inclusive at 5% → base = ₹100, gst = ₹5
    const r = computeGST(10500, 5, true, false);
    expect(r.basePaise).toBe(10000);
    expect(r.gstPaise).toBe(500);
    expect(r.totalPaise).toBe(10500);
  });

  it('28% inclusive splits with odd remainder absorbed in sgst', () => {
    const r = computeGST(12800, 28, true, false);
    expect(r.gstPaise).toBe(r.cgstPaise + r.sgstPaise);
  });
});
