import { BadRequestException } from '@nestjs/common';
import {
  dayWindow,
  monthWindow,
  percentDelta,
  weekDayWindows,
  weekWindow,
} from './report-windows';

describe('report-windows', () => {
  it('dayWindow spans one UTC day', () => {
    const w = dayWindow('2026-07-16');
    expect(w.from.toISOString()).toBe('2026-07-16T00:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-07-17T00:00:00.000Z');
  });

  it('weekWindow spans 7 days', () => {
    const w = weekWindow('2026-07-13');
    expect(w.from.toISOString()).toBe('2026-07-13T00:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('weekDayWindows returns 7 consecutive day windows', () => {
    const days = weekDayWindows('2026-07-13');
    expect(days).toHaveLength(7);
    expect(days[0].from.toISOString()).toBe('2026-07-13T00:00:00.000Z');
    expect(days[6].from.toISOString()).toBe('2026-07-19T00:00:00.000Z');
    expect(days[6].to.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('monthWindow spans first-of-month to first-of-next-month', () => {
    const w = monthWindow('2026-07');
    expect(w.from.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('monthWindow rolls over the year in December', () => {
    const w = monthWindow('2026-12');
    expect(w.to.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('rejects malformed dates', () => {
    expect(() => dayWindow('2026-7-1')).toThrow(BadRequestException);
    expect(() => monthWindow('2026-07-01')).toThrow(BadRequestException);
  });

  describe('percentDelta', () => {
    it('computes a positive delta', () => {
      expect(percentDelta(150, 100)).toBe(50);
    });
    it('computes a negative delta', () => {
      expect(percentDelta(50, 100)).toBe(-50);
    });
    it('handles prev=0 (growth from nothing) as 100', () => {
      expect(percentDelta(500, 0)).toBe(100);
    });
    it('handles 0 vs 0 as 0', () => {
      expect(percentDelta(0, 0)).toBe(0);
    });
    it('rounds to one decimal', () => {
      expect(percentDelta(31337, 24000)).toBe(30.6);
    });
  });
});
