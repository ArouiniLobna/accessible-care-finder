import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, Button, buttonClassName, LoadingIndicator } from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { displayName } from '../../../shared/format/format';
import { isSelectable } from '../../replacement-search/components/AvailabilityBadge';
import { useSearchFilters, withQuery } from '../../replacement-search/hooks/useSearchFilters';
import { useSupportRequest } from '../../support-session/api/useSupportRequest';
import { useWorkerProfile } from '../../worker-profile/api/useWorkerProfile';
import { createIdempotencyKey, useCreateBooking } from '../api/bookings';
import { BookingFailure } from '../components/BookingFailure';
import { BookingSummary } from '../components/BookingSummary';
import styles from './ReviewReplacementPage.module.css';

export default function ReviewReplacementPage() {
  const { supportRequestId = '', workerId = '' } = useParams();
  const { queryString } = useSearchFilters();
  const navigate = useNavigate();
  const matchesHref = withQuery(`/replacement/${supportRequestId}`, queryString);

  const supportRequest = useSupportRequest(supportRequestId);
  const profile = useWorkerProfile(workerId, supportRequestId);
  const booking = useCreateBooking();
  const failureHeading = useRef<HTMLHeadingElement>(null);

  const availability = profile.data?.match?.availability ?? null;
  const name = profile.data ? displayName(profile.data) : 'This support worker';

  // One idempotency key per confirmation attempt: reused by "Try again" for the same slot
  // version (so a lost response can't create a second booking), new for anything different.
  const idempotency = useRef<{ attempt: string; key: string } | null>(null);

  // Focus moves to the failure message only as the direct result of pressing Confirm.
  useEffect(() => {
    if (booking.isError) failureHeading.current?.focus();
  }, [booking.isError]);

  const confirm = () => {
    if (!availability || !profile.data) return;
    const attempt = `${availability.slotId}:${availability.version}`;
    let current = idempotency.current;
    if (!current || current.attempt !== attempt) {
      current = { attempt, key: createIdempotencyKey() };
      idempotency.current = current;
    }
    booking.mutate(
      {
        idempotencyKey: current.key,
        request: {
          supportRequestId,
          workerId: profile.data.id,
          availabilitySlotId: availability.slotId,
          availabilityVersion: availability.version,
        },
      },
      { onSuccess: (created) => void navigate(`/bookings/${created.id}/confirmation`) },
    );
  };

  const loading = supportRequest.isPending || profile.isPending;
  const loadError = supportRequest.isError || profile.isError;

  return (
    <div className={styles.page}>
      <p>
        <Link to={matchesHref}>Back to your matches</Link>
      </p>
      <PageHeading>Review your replacement</PageHeading>

      {loading ? (
        <p>
          <LoadingIndicator label="Loading the details…" />
        </p>
      ) : loadError || !supportRequest.data || !profile.data ? (
        <Alert
          tone="danger"
          title="We couldn't load this replacement"
          actions={
            <Link to={matchesHref} className={buttonClassName({ variant: 'secondary' })}>
              Back to your matches
            </Link>
          }
        />
      ) : (
        <>
          {booking.isError ? (
            <BookingFailure
              error={booking.error}
              workerName={name}
              matchesHref={matchesHref}
              onRetry={confirm}
              headingRef={failureHeading}
            />
          ) : supportRequest.data.status !== 'CANCELLED_NEEDS_REPLACEMENT' ? (
            <Alert
              tone="success"
              title="A replacement is already booked for this session"
              actions={
                <Link to="/" className={buttonClassName({ variant: 'secondary' })}>
                  Back to your support
                </Link>
              }
            />
          ) : !isSelectable(availability?.status) ? (
            // Learned passively (SSE or refetch): shown, announced by the stream, focus untouched.
            <Alert
              tone="warning"
              title={`${name} is no longer available for this session`}
              actions={
                <Link to={matchesHref} className={buttonClassName({ variant: 'primary' })}>
                  Choose another support worker
                </Link>
              }
            >
              <p>Nothing has been booked. Your other matches are still available.</p>
            </Alert>
          ) : null}

          <section aria-labelledby="summary-heading" className={styles.section}>
            <h2 id="summary-heading">Replacement details</h2>
            <BookingSummary
              workerName={name}
              startsAt={supportRequest.data.startsAt}
              endsAt={supportRequest.data.endsAt}
              timezone={supportRequest.data.timezone}
              services={supportRequest.data.services}
              hourlyRateCents={profile.data.hourlyRateCents}
              location={`${supportRequest.data.location.suburb} ${supportRequest.data.location.postcode}`}
            />
            <p className={styles.note}>
              No payment is taken now. The total is an estimate based on the hourly rate and session
              length.
            </p>
          </section>

          {!booking.isError &&
          supportRequest.data.status === 'CANCELLED_NEEDS_REPLACEMENT' &&
          isSelectable(availability?.status) ? (
            <div className={styles.actions}>
              <Button
                variant="primary"
                busy={booking.isPending}
                busyLabel="Confirming replacement…"
                onClick={confirm}
              >
                Confirm replacement
              </Button>
              <Link to={matchesHref} className={buttonClassName({ variant: 'tertiary' })}>
                Choose someone else
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
