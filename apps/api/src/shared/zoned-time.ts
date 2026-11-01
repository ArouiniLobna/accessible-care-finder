/**
 * Convert a wall-clock time in an IANA timezone to a UTC instant, DST-safely, using only Intl.
 *
 * The seed needs "Saturday 10:00 in Australia/Sydney" regardless of whether that date falls in
 * AEST (+10) or AEDT (+11). We guess the instant, measure the zone's real offset at that instant,
 * and correct. A second pass handles guesses that land on the other side of a transition.
 * Wall-clock times inside a DST gap/overlap (02:00–03:00 in Sydney) are never used by the demo.
 */

export interface LocalDate {
  year: number;
  month: number; // 1–12
  day: number;
}

function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

export function zonedDateTimeToUtc(
  date: LocalDate,
  hours: number,
  minutes: number,
  timeZone: string,
): Date {
  const wallClockAsUtc = Date.UTC(date.year, date.month - 1, date.day, hours, minutes);
  let instant = wallClockAsUtc - offsetMinutesAt(new Date(wallClockAsUtc), timeZone) * 60_000;
  instant = wallClockAsUtc - offsetMinutesAt(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/** Calendar date (in `timeZone`) of an instant. */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Pure calendar arithmetic (no timezone involved). */
export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function parseLocalDate(value: string): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected YYYY-MM-DD, received "${value}"`);
  const [, y, m, d] = match;
  const date = { year: Number(y), month: Number(m), day: Number(d) };
  const roundTrip = addDays(date, 0);
  if (roundTrip.month !== date.month || roundTrip.day !== date.day) {
    throw new Error(`"${value}" is not a real calendar date`);
  }
  return date;
}
