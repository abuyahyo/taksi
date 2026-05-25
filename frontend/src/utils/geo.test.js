import { describe, it, expect } from 'vitest';
import { parseLatLng, masofaKm } from './geo';

describe('parseLatLng', () => {
  it('тўғри "lat, lng" сатрини айлантиради', () => {
    expect(parseLatLng('41.3, 69.24')).toEqual([41.3, 69.24]);
    expect(parseLatLng('  -1.5 , 100  ')).toEqual([-1.5, 100]);
  });

  it('нотўғри киритмада null', () => {
    expect(parseLatLng('')).toBeNull();
    expect(parseLatLng(null)).toBeNull();
    expect(parseLatLng('salom')).toBeNull();
    expect(parseLatLng('41.3')).toBeNull();
  });

  it('диапазондан ташқари координата → null', () => {
    expect(parseLatLng('91, 10')).toBeNull();   // lat > 90
    expect(parseLatLng('10, 181')).toBeNull();  // lng > 180
  });
});

describe('masofaKm', () => {
  it('нуқта йўқ бўлса 0', () => {
    expect(masofaKm(null, [41, 69])).toBe(0);
    expect(masofaKm([41, 69], null)).toBe(0);
  });

  it('бир хил нуқта → 0', () => {
    expect(masofaKm([41.3, 69.24], [41.3, 69.24])).toBe(0);
  });

  it('маълум масофа тахминан тўғри (Тошкент ичида ~2-3 км)', () => {
    const d = masofaKm([41.2995, 69.2401], [41.3111, 69.2797]);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(5);
  });
});
