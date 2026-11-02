import type { AvailabilityStatus, DemoSlot } from '@acf/contracts';
import { Alert, Badge, Button, Checkbox, LoadingIndicator } from '@acf/ui';
import { useAnnouncer } from '../../../shared/accessibility/announcer';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { config } from '../../../shared/config';
import { formatTimeRange } from '../../../shared/format/format';
import { AVAILABILITY_PRESENTATION } from '../../replacement-search/components/AvailabilityBadge';
import { useDemoAvailability, useResetDemo, useSetFaults, useSetSlotStatus } from '../api/demo';
import styles from './DemoControlsPage.module.css';

const FEATURED = 6;
const STATUS_TEXT: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'Available',
  TENTATIVE: 'Tentative',
  BOOKED: 'Booked',
  UNAVAILABLE: 'Unavailable',
};

function SlotTable({ caption, slots }: { caption: string; slots: DemoSlot[] }) {
  const setStatus = useSetSlotStatus();
  const { announce } = useAnnouncer();

  const change = (slot: DemoSlot, status: AvailabilityStatus, broadcast = true) =>
    setStatus.mutate(
      { slotId: slot.slotId, status, broadcast },
      {
        onSuccess: (result) =>
          announce(
            `${slot.workerDisplayName}: ${STATUS_TEXT[result.status].toLowerCase()}, version ${result.version}${
              broadcast ? '.' : ', without a live update.'
            }`,
          ),
        onError: () => announce(`Couldn't change ${slot.workerDisplayName}. Please try again.`),
      },
    );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Support worker</th>
            <th scope="col">Slot (Sydney time)</th>
            <th scope="col">Covers the demo session?</th>
            <th scope="col">Status</th>
            <th scope="col">Version</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.slotId}>
              <th scope="row">{slot.workerDisplayName}</th>
              <td>{formatTimeRange(slot.startsAt, slot.endsAt, 'Australia/Sydney')}</td>
              <td>{slot.coversDemoSession ? 'Yes' : 'No — partial day'}</td>
              <td>
                {/* Raw status for the presenter; customers see "No longer available". */}
                <Badge tone={AVAILABILITY_PRESENTATION[slot.status].tone} withIcon>
                  {STATUS_TEXT[slot.status]}
                </Badge>
              </td>
              <td>{slot.version}</td>
              <td>
                {/* aria-label keeps the visible words first (label in name) and adds the worker,
                    so each button is unique. A visually-hidden span here would get an extra space
                    from Chromium ("Make unavailable : Amelia R."). */}
                <div className={styles.actions}>
                  {slot.status !== 'AVAILABLE' ? (
                    <Button
                      variant="secondary"
                      aria-label={`Make available: ${slot.workerDisplayName}`}
                      onClick={() => change(slot, 'AVAILABLE')}
                    >
                      Make available
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        aria-label={`Make unavailable: ${slot.workerDisplayName}`}
                        onClick={() => change(slot, 'UNAVAILABLE')}
                      >
                        Make unavailable
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Mark booked: ${slot.workerDisplayName}`}
                        onClick={() => change(slot, 'BOOKED')}
                      >
                        Mark booked
                      </Button>
                      <Button
                        variant="tertiary"
                        aria-label={`Change version silently: ${slot.workerDisplayName}`}
                        onClick={() => change(slot, 'AVAILABLE', false)}
                      >
                        Change version silently
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Presenter tooling, behind ENABLE_DEMO_CONTROLS. Acts as "another customer" or the worker,
 * so the realtime and conflict behaviour can be shown in a second tab.
 */
export default function DemoControlsPage() {
  const availability = useDemoAvailability();
  const setFaults = useSetFaults();
  const reset = useResetDemo();
  const { announce } = useAnnouncer();

  if (!config.demoControlsEnabled) {
    return (
      <>
        <PageHeading>Demo controls</PageHeading>
        <p>Demo controls are turned off in this environment.</p>
      </>
    );
  }

  const slots = availability.data?.slots ?? [];
  const featured = slots.slice(0, FEATURED);
  const others = slots.slice(FEATURED);

  return (
    <div className={styles.page}>
      <PageHeading>Demo controls</PageHeading>
      <Alert tone="info" title="For demonstrations only">
        <p>
          Open <strong>Find a replacement</strong> in another tab, then change a worker here. That
          tab updates without a refresh. In a real product these controls would not exist:
          availability changes come from workers and other customers.
        </p>
        <ul>
          <li>
            <strong>Make unavailable / Mark booked</strong> sends a live update, like another
            customer booking the worker.
          </li>
          <li>
            <strong>Change version silently</strong> changes the slot without a live update, like a
            missed message. Confirming that worker afterwards shows the booking-conflict recovery.
          </li>
        </ul>
      </Alert>

      {availability.isPending ? (
        <p>
          <LoadingIndicator label="Loading availability…" />
        </p>
      ) : availability.isError ? (
        <Alert
          tone="danger"
          title="We couldn't load demo availability"
          actions={
            <Button variant="secondary" onClick={() => void availability.refetch()}>
              Try again
            </Button>
          }
        >
          <p>Check that the API is running with ENABLE_DEMO_CONTROLS=true.</p>
        </Alert>
      ) : (
        <>
          <section aria-labelledby="featured-heading">
            <h2 id="featured-heading">Featured workers</h2>
            <SlotTable caption="Featured workers on the demo session day" slots={featured} />
          </section>

          <details className={styles.more}>
            <summary>All other workers that day ({others.length})</summary>
            <SlotTable caption="Other workers on the demo session day" slots={others} />
          </details>

          <section aria-labelledby="faults-heading">
            <h2 id="faults-heading">Failure simulation</h2>
            <Checkbox
              label="Make worker search fail"
              description="Search requests return an error, so the recoverable error state can be shown."
              checked={availability.data.faults.searchFailure}
              onChange={(event) => {
                const searchFailure = event.currentTarget.checked;
                setFaults.mutate(
                  { searchFailure },
                  {
                    onSuccess: () =>
                      announce(searchFailure ? 'Search failures on.' : 'Search failures off.'),
                  },
                );
              }}
            />
            <p className={styles.hint}>
              For slow responses, set DEMO_LATENCY_MIN_MS and DEMO_LATENCY_MAX_MS for the API.
            </p>
          </section>

          <section aria-labelledby="reset-heading">
            <h2 id="reset-heading">Reset</h2>
            <p>Restore every worker, cancel demo bookings and return to the original scenario.</p>
            <Button
              variant="danger"
              busy={reset.isPending}
              busyLabel="Resetting…"
              onClick={() =>
                reset.mutate(undefined, { onSuccess: () => announce('Demo scenario reset.') })
              }
            >
              Reset demo scenario
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
