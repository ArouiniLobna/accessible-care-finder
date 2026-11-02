import { Link } from 'react-router';
import type { WorkerSummary } from '@acf/contracts';
import { Badge, buttonClassName, VisuallyHidden } from '@acf/ui';
import { displayName, formatList, formatMoney } from '../../../shared/format/format';
import { AvailabilityBadge, isSelectable } from './AvailabilityBadge';
import styles from './WorkerCard.module.css';

export interface WorkerCardProps {
  worker: WorkerSummary;
  profileHref: string;
  selectHref: string;
}

/**
 * One search result: enough to decide, not everything.
 *
 * Structure: <article> labelled by its <h3> name. Actions have unique accessible names whose
 * visible words come first ("View Amelia R.'s profile", "Select Amelia R."), satisfying
 * label-in-name. Decorative initials are hidden; availability is text, not a dot.
 */
export function WorkerCard({ worker, profileHref, selectHref }: WorkerCardProps) {
  const name = displayName(worker);
  const headingId = `worker-${worker.id}-name`;
  const selectable = isSelectable(worker.availability.status);

  return (
    <article
      aria-labelledby={headingId}
      className={styles.card}
      data-unavailable={!selectable || undefined}
    >
      <div className={styles.header}>
        <span aria-hidden="true" className={styles.avatar}>
          {worker.firstName.charAt(0)}
          {worker.lastInitial}
        </span>
        <div className={styles.identity}>
          {/* tabIndex -1: focus target after "Load more"; not in the Tab order. */}
          <h3 id={headingId} tabIndex={-1} className={styles.name}>
            {name}
          </h3>
          {worker.verified ? (
            <Badge tone="info" withIcon>
              Verified
            </Badge>
          ) : null}
        </div>
      </div>

      <AvailabilityBadge status={worker.availability.status} />

      <dl className={styles.facts}>
        <div>
          <dt>Rating</dt>
          <dd>
            {worker.reviewCount > 0
              ? `${worker.rating.toFixed(1)} out of 5 from ${worker.reviewCount} ${worker.reviewCount === 1 ? 'review' : 'reviews'}`
              : 'No reviews yet'}
          </dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{worker.distanceKm.toFixed(1)} km away</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{formatMoney(worker.hourlyRateCents)} per hour</dd>
        </div>
        <div>
          <dt>Languages</dt>
          <dd>{formatList(worker.languages.map((language) => language.name))}</dd>
        </div>
        {worker.hasTransport ? (
          <div>
            <dt>Transport</dt>
            <dd>Has own transport</dd>
          </div>
        ) : null}
      </dl>

      <div>
        <h4 className={styles.servicesHeading}>Services</h4>
        <ul className={styles.services}>
          {worker.services.map((service) => (
            <li key={service.id}>{service.name}</li>
          ))}
        </ul>
      </div>

      <div className={styles.actions}>
        <Link to={profileHref} className={buttonClassName({ variant: 'secondary' })}>
          View {name}'s profile
        </Link>
        {selectable ? (
          <Link to={selectHref} className={buttonClassName({ variant: 'primary' })}>
            Select {name}
          </Link>
        ) : (
          <p className={styles.notSelectable}>
            Can't be selected for this session
            <VisuallyHidden>: {name}</VisuallyHidden>
          </p>
        )}
      </div>
    </article>
  );
}
