/**
 * Money is integer AUD cents end to end. Durations come from the stored instants, so a
 * session spanning a DST change is still priced on its real length.
 */
export function estimateTotalCents(hourlyRateCents: number, startsAt: Date, endsAt: Date): number {
  const minutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  return Math.round((hourlyRateCents * minutes) / 60);
}
