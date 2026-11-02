import type { AvailabilityStatus } from '@acf/contracts';
import type { AvailabilityEventHub } from './availability.events';
import type { ChangedSlot } from './availability.repository';

/**
 * Publishes a committed slot change to SSE subscribers.
 * Callers must only invoke this AFTER their transaction commits: an event for a change that
 * later rolls back would tell browsers something that never happened.
 */
export function createAvailabilityNotifier(hub: AvailabilityEventHub) {
  return {
    announce(change: ChangedSlot) {
      return hub.publish({
        workerId: change.workerId,
        workerDisplayName: change.workerDisplayName,
        slotId: change.slotId,
        status: change.status satisfies AvailabilityStatus,
        version: change.version,
        updatedAt: change.updatedAt.toISOString(),
      });
    },
    requestResync(reason: string) {
      hub.publishResync(reason);
    },
  };
}

export type AvailabilityNotifier = ReturnType<typeof createAvailabilityNotifier>;
