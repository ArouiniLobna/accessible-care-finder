import { Link } from 'react-router';
import { Alert, Button, buttonClassName, LoadingIndicator } from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { config } from '../../../shared/config';
import { useSupportRequest } from '../api/useSupportRequest';
import { SupportRequestSummary } from '../components/SupportRequestSummary';
import styles from './HomePage.module.css';

export default function HomePage() {
  const {
    data: request,
    isPending,
    isError,
    refetch,
  } = useSupportRequest(config.demoSupportRequestId);

  return (
    <div className={styles.page}>
      <PageHeading>Upcoming support</PageHeading>

      {isPending ? (
        <p>
          <LoadingIndicator label="Loading your upcoming support…" />
        </p>
      ) : isError ? (
        <Alert
          tone="danger"
          title="We couldn't load your upcoming support"
          actions={
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        >
          <p>Please check your connection and try again.</p>
        </Alert>
      ) : (
        <>
          {request.status === 'CANCELLED_NEEDS_REPLACEMENT' ? (
            <Alert
              tone="warning"
              title="Your regular support worker is no longer available for this session"
            >
              <p>
                We already know when, where and what support you need, so you won't need to enter it
                again.
              </p>
            </Alert>
          ) : (
            <Alert tone="success" title="A replacement support worker is booked for this session" />
          )}

          <SupportRequestSummary request={request} title="Session details" />

          <div className={styles.actions}>
            {request.status === 'CANCELLED_NEEDS_REPLACEMENT' ? (
              <Link
                to={`/replacement/${request.id}`}
                className={buttonClassName({ variant: 'primary' })}
              >
                Find a replacement
              </Link>
            ) : request.replacementBookingId ? (
              <Link
                to={`/bookings/${request.replacementBookingId}/confirmation`}
                className={buttonClassName({ variant: 'secondary' })}
              >
                View your replacement booking
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
