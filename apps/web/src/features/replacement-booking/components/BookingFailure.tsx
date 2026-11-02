import type { Ref } from 'react';
import { Link } from 'react-router';
import { Alert, Button, buttonClassName } from '@acf/ui';
import { isApiRequestError } from '../../../shared/api/http';

interface BookingFailureProps {
  error: unknown;
  workerName: string;
  matchesHref: string;
  onRetry: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}

/**
 * Explains a failed confirmation plainly, without blaming the customer, and always offers a
 * way forward. Their filters travel in `matchesHref`, so nothing has to be re-entered.
 */
export function BookingFailure({
  error,
  workerName,
  matchesHref,
  onRetry,
  headingRef,
}: BookingFailureProps) {
  if (isApiRequestError(error, 'WORKER_NO_LONGER_AVAILABLE')) {
    return (
      <Alert
        tone="danger"
        title={`${workerName} is no longer available for this session`}
        headingRef={headingRef}
        actions={
          <Link to={matchesHref} className={buttonClassName({ variant: 'primary' })}>
            View updated matches
          </Link>
        }
      >
        <p>
          Their availability changed after you selected them, so nothing has been booked. We&apos;ve
          refreshed your matches so you can choose another support worker.
        </p>
      </Alert>
    );
  }

  if (isApiRequestError(error, 'BOOKING_CONFLICT')) {
    return (
      <Alert
        tone="warning"
        title="A replacement is already booked for this session"
        headingRef={headingRef}
        actions={
          <Link to="/" className={buttonClassName({ variant: 'secondary' })}>
            Back to your support
          </Link>
        }
      >
        <p>This session already has a confirmed replacement, so we haven&apos;t booked another.</p>
      </Alert>
    );
  }

  return (
    <Alert
      tone="danger"
      title="We couldn't confirm the replacement"
      headingRef={headingRef}
      actions={
        <>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
          <Link to={matchesHref} className={buttonClassName({ variant: 'secondary' })}>
            Back to your matches
          </Link>
        </>
      }
    >
      <p>
        Nothing has been booked. This can happen if the connection drops. Trying again is safe — you
        won&apos;t be booked twice.
      </p>
    </Alert>
  );
}
