import { describe, it, expect } from 'vitest';
import { tavsiyaHisobi, ASOSIY, PER_KM, MIN_NARX } from './narx';

describe('tavsiyaHisobi', () => {
  it('қисқа масофада энг кам нархдан паст тушмайди', () => {
    expect(tavsiyaHisobi(0)).toBe(MIN_NARX);
    expect(tavsiyaHisobi(1)).toBe(Math.max(MIN_NARX, ASOSIY + PER_KM)); // 7000 < 8000 → 8000
  });

  it('узоқ масофада асосий + км ҳисобланади', () => {
    expect(tavsiyaHisobi(5)).toBe(ASOSIY + 5 * PER_KM); // 5000 + 10000 = 15000
    expect(tavsiyaHisobi(10)).toBe(ASOSIY + 10 * PER_KM); // 25000
  });

  it('каср масофа яхлитланади', () => {
    expect(tavsiyaHisobi(2.5)).toBe(ASOSIY + Math.round(2.5 * PER_KM)); // 5000 + 5000 = 10000
  });

  it('нотўғри киритма → энг кам нарх', () => {
    expect(tavsiyaHisobi('xato')).toBe(MIN_NARX);
    expect(tavsiyaHisobi(undefined)).toBe(MIN_NARX);
    expect(tavsiyaHisobi(-5)).toBe(MIN_NARX);
  });
});
