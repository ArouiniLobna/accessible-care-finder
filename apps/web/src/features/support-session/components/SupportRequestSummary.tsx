import type { SupportRequest } from '@acf/contracts';
import {
  formatSessionDate,
  formatTimeRange,
  formatTimeZoneAbbreviation,
} from '../../../shared/format/format';
import styles from './SupportRequestSummary.module.css';

interface Props {
  request: SupportRequest;
  headingLevel?: 2 | 3;
  title?: string;
}

/**
 * What the replacement must cover. Shown on search, review and confirmation, so the customer
 * never has to remember or re-enter it. Absolute date + time with the zone abbreviation.
 */
export function SupportRequestSummary({
  request,
  headingLevel = 2,
  title = 'Your support session',
}: Props) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section aria-labelledby="session-summary-heading" className={styles.summary}>
      <Heading id="session-summary-heading" className={styles.heading}>
        {title}
      </Heading>
      <dl className={styles.details}>
        <div>
          <dt>Date</dt>
          <dd>
            <time dateTime={request.startsAt}>
              {formatSessionDate(request.startsAt, request.timezone)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {formatTimeRange(request.startsAt, request.endsAt, request.timezone)}{' '}
            <abbr title="Sydney local time" className={styles.zone}>
              {formatTimeZoneAbbreviation(request.startsAt, request.timezone)}
            </abbr>
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {request.location.suburb} {request.location.postcode}
          </dd>
        </div>
        <div>
          <dt>Support needed</dt>
          <dd>
            <ul className={styles.services}>
              {request.services.map((service) => (
                <li key={service.id}>{service.name}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </section>
  );
}
