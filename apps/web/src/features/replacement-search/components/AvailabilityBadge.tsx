import type { AvailabilityStatus } from '@acf/contracts';
import { Badge, type BadgeTone } from '@acf/ui';

/**
 * Availability for *this* session, as text first. Booked and unavailable read the same to the
 * customer ("No longer available"): why a worker became unavailable is not their business.
 */
export const AVAILABILITY_PRESENTATION: Record<
  AvailabilityStatus,
  { label: string; tone: BadgeTone }
> = {
  AVAILABLE: { label: 'Available for your session', tone: 'success' },
  TENTATIVE: { label: 'On hold — not selectable right now', tone: 'warning' },
  BOOKED: { label: 'No longer available', tone: 'danger' },
  UNAVAILABLE: { label: 'No longer available', tone: 'danger' },
};

export function AvailabilityBadge({ status }: { status: AvailabilityStatus | null }) {
  if (status === null) return <Badge tone="neutral">Not available at this time</Badge>;
  const { label, tone } = AVAILABILITY_PRESENTATION[status];
  return (
    <Badge tone={tone} withIcon>
      {label}
    </Badge>
  );
}

export const isSelectable = (status: AvailabilityStatus | null | undefined) =>
  status === 'AVAILABLE';
