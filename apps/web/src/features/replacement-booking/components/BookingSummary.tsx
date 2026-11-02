import type { Service } from '@acf/contracts';
import {
  durationMinutes,
  estimateTotalCents,
  formatDuration,
  formatMoney,
  formatSessionDate,
  formatTimeRange,
  formatTimeZoneAbbreviation,
} from '../../../shared/format/format';
import styles from './BookingSummary.module.css';

interface BookingSummaryProps {
  workerName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  services: readonly Service[];
  hourlyRateCents: number;
  location?: string;
}

/** Everything the customer is agreeing to, in one place (error prevention, WCAG 3.3.4). */
export function BookingSummary({
  workerName,
  startsAt,
  endsAt,
  timezone,
  services,
  hourlyRateCents,
  location,
}: BookingSummaryProps) {
  const minutes = durationMinutes(startsAt, endsAt);
  return (
    <dl className={styles.summary}>
      <div>
        <dt>Support worker</dt>
        <dd>{workerName}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>
          <time dateTime={startsAt}>{formatSessionDate(startsAt, timezone)}</time>
        </dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>
          {formatTimeRange(startsAt, endsAt, timezone)}{' '}
          {formatTimeZoneAbbreviation(startsAt, timezone)}
        </dd>
      </div>
      {location ? (
        <div>
          <dt>Location</dt>
          <dd>{location}</dd>
        </div>
      ) : null}
      <div>
        <dt>Services</dt>
        <dd>{services.map((service) => service.name).join(' · ')}</dd>
      </div>
      <div>
        <dt>Hourly rate</dt>
        <dd>{formatMoney(hourlyRateCents)} per hour</dd>
      </div>
      <div>
        <dt>Estimated duration</dt>
        <dd>{formatDuration(minutes)}</dd>
      </div>
      <div className={styles.total}>
        <dt>Estimated total</dt>
        <dd>{formatMoney(estimateTotalCents(hourlyRateCents, startsAt, endsAt))}</dd>
      </div>
    </dl>
  );
}
