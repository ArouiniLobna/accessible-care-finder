import { describe, expect, it } from 'vitest';
import { haversineKm } from '../../src/shared/geo';
import {
  addDays,
  localDateOf,
  parseLocalDate,
  zonedDateTimeToUtc,
} from '../../src/shared/zoned-time';
import { estimateTotalCents } from '../../src/shared/money';

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(
      haversineKm(
        { latitude: -33.815, longitude: 151.0011 },
        { latitude: -33.815, longitude: 151.0011 },
      ),
    ).toBe(0);
  });

  it('measures 0.0216° of latitude as ~2.4 km (the seeded Amelia distance)', () => {
    const km = haversineKm(
      { latitude: -33.815, longitude: 151.0011 },
      { latitude: -33.7934, longitude: 151.0011 },
    );
    expect(km).toBeCloseTo(2.4, 1);
  });

  it('matches a known distance: Sydney CBD → Parramatta ≈ 19.6 km', () => {
    const km = haversineKm(
      { latitude: -33.8688, longitude: 151.2093 },
      { latitude: -33.815, longitude: 151.0011 },
    );
    expect(km).toBeGreaterThan(19);
    expect(km).toBeLessThan(20.5);
  });
});

describe('zonedDateTimeToUtc (Australia/Sydney, DST-safe)', () => {
  const tz = 'Australia/Sydney';

  it('uses AEDT (+11) in summer', () => {
    expect(zonedDateTimeToUtc({ year: 2027, month: 1, day: 9 }, 10, 0, tz).toISOString()).toBe(
      '2027-01-08T23:00:00.000Z',
    );
  });

  it('uses AEST (+10) in winter', () => {
    expect(zonedDateTimeToUtc({ year: 2027, month: 6, day: 12 }, 10, 0, tz).toISOString()).toBe(
      '2027-06-12T00:00:00.000Z',
    );
  });

  it('handles the day DST starts and the day it ends', () => {
    expect(zonedDateTimeToUtc({ year: 2026, month: 10, day: 4 }, 10, 0, tz).toISOString()).toBe(
      '2026-10-03T23:00:00.000Z',
    );
    expect(zonedDateTimeToUtc({ year: 2027, month: 4, day: 4 }, 10, 0, tz).toISOString()).toBe(
      '2027-04-04T00:00:00.000Z',
    );
  });

  it('round-trips the calendar date', () => {
    const instant = zonedDateTimeToUtc({ year: 2026, month: 11, day: 7 }, 10, 0, tz);
    expect(localDateOf(instant, tz)).toEqual({ year: 2026, month: 11, day: 7 });
  });
});

describe('calendar helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays({ year: 2026, month: 12, day: 30 }, 3)).toEqual({
      year: 2027,
      month: 1,
      day: 2,
    });
  });

  it('rejects impossible dates', () => {
    expect(() => parseLocalDate('2026-02-30')).toThrow();
    expect(() => parseLocalDate('7/11/2026')).toThrow();
  });
});

describe('estimateTotalCents', () => {
  it('prices a 3 hour session at $58.00/hour as $174.00', () => {
    expect(
      estimateTotalCents(5800, new Date('2026-11-06T23:00:00Z'), new Date('2026-11-07T02:00:00Z')),
    ).toBe(17400);
  });

  it('rounds partial hours to the nearest cent', () => {
    expect(
      estimateTotalCents(5555, new Date('2026-11-06T23:00:00Z'), new Date('2026-11-06T23:20:00Z')),
    ).toBe(1852);
  });
});
