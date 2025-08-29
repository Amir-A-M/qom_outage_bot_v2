// tests/utils/toReadableJalali.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { toReadableJalali } from '../../src/utils/toReadableJalali';

describe('toReadableJalali', () => {
  const fixedNow = new Date(2025, 7, 26);
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns امروز for today', () => {
    expect(toReadableJalali(new Date(2025, 7, 26))).toContain('امروز');
  });

  it('returns دیروز for yesterday', () => {
    expect(toReadableJalali(new Date(2025, 7, 25))).toContain('دیروز');
  });

  it('returns فردا for tomorrow', () => {
    expect(toReadableJalali(new Date(2025, 7, 27))).toContain('فردا');
  });

  it('returns formatted Jalali date for other days', () => {
    const result = toReadableJalali(new Date(2025, 7, 20));
    expect(result).toMatch(/\d+ \p{L}+/u); // e.g. "4 شهریور"
    expect(result).not.toContain('امروز');
    expect(result).not.toContain('دیروز');
    expect(result).not.toContain('فردا');
  });
});
