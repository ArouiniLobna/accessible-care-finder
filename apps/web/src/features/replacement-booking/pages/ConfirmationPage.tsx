import { Link, useParams } from 'react-router';
import { Alert, buttonClassName, LoadingIndicator } from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { displayName } from '../../../shared/format/format';
import { useBooking } from '../api/bookings';
import { BookingSummary } from '../components/BookingSummary';
import styles from './ConfirmationPage.module.css';

/** A calm, clear confirmation: no confetti, no motion, one obvious next step. */
export default function ConfirmationPage() {
  const { bookingId = '' } = useParams();
  const booking = useBooking(bookingId);

  return (
    <div className={styles.page}>
      <PageHeading>Replacement support confirmed</PageHeading>

      {booking.isPending ? (
        <p>
          <LoadingIndicator label="Loading your booking…" />
        </p>
      ) : booking.isError ? (
        <Alert tone="danger" title="We couldn't load this booking" />
      ) : (
        <>
          <Alert tone="success" title={`${displayName(booking.data.worker)} will support you`}>
            <p>Your regular session time and support needs stay the same.</p>
          </Alert>
          <section aria-labelledby="booking-heading" className={styles.section}>
            <h2 id="booking-heading">Booking details</h2>
            <BookingSummary
              workerName={displayName(booking.data.worker)}
              startsAt={booking.data.startsAt}
              endsAt={booking.data.endsAt}
              timezone={booking.data.timezone}
              services={booking.data.services}
              hourlyRateCents={booking.data.hourlyRateCents}
            />
            <p className={styles.note}>Booking reference: {booking.data.id}</p>
          </section>
        </>
      )}

      <div className={styles.actions}>
        <Link to="/" className={buttonClassName({ variant: 'primary' })}>
          Back to your support
        </Link>
      </div>
    </div>
  );
}
