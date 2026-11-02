import { describe, expect, it } from 'vitest';
import {
  displayName,
  estimateTotalCents,
  formatDuration,
  formatList,
  formatMoney,
  formatSessionDate,
  formatTimeRange,
  formatTimeZoneAbbreviation,
} from './format';

// 10:00–13:00 on Saturday 7 November 2026 in Sydney (AEDT, UTC+11).
const start = '2026-11-06T23:00:00.000Z';
const end = '2026-11-07T02:00:00.000Z';
const tz = 'Australia/Sydney';

describe('format', () => {
  it('formats the session date in the session time zone, not the browser’s', () => {
    expect(formatSessionDate(start, tz)).toMatch(/Saturday,? 7 November 2026/);
  });

  it('formats a time range and zone abbreviation', () => {
    expect(formatTimeRange(start, end, tz).replace(/\s/g, ' ')).toMatch(/10:00 am\s*–\s*1:00 pm/);
    expect(formatTimeZoneAbbreviation(start, tz)).toBe('AEDT');
  });
  it('formats AUD from integer cents', () => {
    expect(formatMoney(5800)).toBe('$58.00');
    expect(formatMoney(17400)).toBe('$174.00');
  });

  it('joins lists in natural language', () => {
    expect(formatList(['English', 'Arabic'])).toBe('English and Arabic');
  });

  it('builds display names from first name and last initial only', () => {
    expect(displayName({ firstName: 'Amelia', lastInitial: 'R' })).toBe('Amelia R.');
  });
  it('formats durations and estimates', () => {
    expect(formatDuration(180)).toBe('3 hours');
    expect(formatDuration(90)).toBe('1 hour 30 minutes');
    expect(estimateTotalCents(5800, start, end)).toBe(17400);
  });
});
