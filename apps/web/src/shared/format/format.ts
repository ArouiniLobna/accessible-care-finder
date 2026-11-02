/**
 * All user-visible dates, times and money go through Intl with an explicit time zone and
 * currency. No string slicing of ISO dates, so DST and locale are handled by the platform.
 */
const LOCALE = 'en-AU';
const currency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'AUD' });

/** 5800 → "$58.00" */
export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

/** "Saturday 7 November 2026" — absolute, never just "Tomorrow". */
export function formatSessionDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}

/** "10:00 am – 1:00 pm" */
export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  const format = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', timeZone });
  return format.formatRange(new Date(startIso), new Date(endIso));
}

/** "AEDT" — shown next to times so they are unambiguous. */
export function formatTimeZoneAbbreviation(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: 'short' }).formatToParts(
    new Date(iso),
  );
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/** 180 → "3 hours", 90 → "1 hour 30 minutes" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ') || '0 minutes';
}

/** Mirrors the API's estimate: rate × real duration, rounded to the cent. */
export function estimateTotalCents(
  hourlyRateCents: number,
  startIso: string,
  endIso: string,
): number {
  return Math.round((hourlyRateCents * durationMinutes(startIso, endIso)) / 60);
}

/** ["English", "Arabic"] → "English and Arabic" */
export function formatList(items: readonly string[]): string {
  return new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' }).format(items);
}

export const displayName = (person: { firstName: string; lastInitial: string }) =>
  `${person.firstName} ${person.lastInitial}.`;
