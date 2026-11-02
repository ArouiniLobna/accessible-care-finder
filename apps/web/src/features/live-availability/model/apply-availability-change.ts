import type { InfiniteData } from '@tanstack/react-query';
import type {
  AvailabilityChangedEvent,
  DemoAvailabilityResponse,
  SearchWorkersResponse,
  SlotAvailability,
  WorkerProfile,
} from '@acf/contracts';
import { AVAILABILITY_STATUSES } from '@acf/contracts/constants';

/**
 * Pure cache patches for one `availability.changed` event.
 *
 * A patch applies only when the cached slot is the event's slot AND the event's version is
 * newer. Out-of-order or duplicate events (e.g. replayed after a reconnect) are ignored, so
 * applying the same event twice is harmless.
 *
 * Each function returns the *same object* when nothing changed, which lets callers detect
 * "this cache entry was affected" and keeps React Query from notifying observers needlessly.
 */

function patchSlot(
  availability: SlotAvailability,
  event: AvailabilityChangedEvent,
): SlotAvailability {
  if (availability.slotId !== event.slotId || event.version <= availability.version)
    return availability;
  return { ...availability, status: event.status, version: event.version };
}

export function patchSearchPages(
  data: InfiniteData<SearchWorkersResponse, string | null>,
  event: AvailabilityChangedEvent,
): InfiniteData<SearchWorkersResponse, string | null> {
  let changed = false;
  const pages = data.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((worker) => {
      if (worker.id !== event.workerId) return worker;
      const availability = patchSlot(worker.availability, event);
      if (availability === worker.availability) return worker;
      pageChanged = true;
      return { ...worker, availability };
    });
    if (!pageChanged) return page;
    changed = true;
    return { ...page, items };
  });
  return changed ? { ...data, pages } : data;
}

export function searchPagesContainWorker(
  data: InfiniteData<SearchWorkersResponse, string | null>,
  workerId: string,
): boolean {
  return data.pages.some((page) => page.items.some((worker) => worker.id === workerId));
}

export function patchWorkerProfile(
  profile: WorkerProfile,
  event: AvailabilityChangedEvent,
): WorkerProfile {
  const current = profile.match?.availability;
  if (profile.id !== event.workerId || !profile.match || !current) return profile;
  const availability = patchSlot(current, event);
  if (availability === current) return profile;
  return { ...profile, match: { ...profile.match, availability } };
}

export function patchDemoAvailability(
  data: DemoAvailabilityResponse,
  event: AvailabilityChangedEvent,
): DemoAvailabilityResponse {
  let changed = false;
  const slots = data.slots.map((slot) => {
    if (slot.slotId !== event.slotId || event.version <= slot.version) return slot;
    changed = true;
    return { ...slot, status: event.status, version: event.version };
  });
  return changed ? { ...data, slots } : data;
}

/** Runtime check for SSE payloads: the stream is external input. */
export function parseAvailabilityEvent(raw: string): AvailabilityChangedEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const status = AVAILABILITY_STATUSES.find((candidate) => candidate === v['status']);
  if (
    typeof v['eventId'] !== 'string' ||
    typeof v['workerId'] !== 'string' ||
    typeof v['workerDisplayName'] !== 'string' ||
    typeof v['slotId'] !== 'string' ||
    typeof v['version'] !== 'number' ||
    typeof v['updatedAt'] !== 'string' ||
    status === undefined
  ) {
    return null;
  }
  return {
    eventId: v['eventId'],
    workerId: v['workerId'],
    workerDisplayName: v['workerDisplayName'],
    slotId: v['slotId'],
    status,
    version: v['version'],
    updatedAt: v['updatedAt'],
  };
}

/** One sentence for assistive technology, or a summary when several workers changed at once. */
export function describeAvailabilityChanges(
  changes: readonly AvailabilityChangedEvent[],
): string | null {
  // Keep only the latest change per worker.
  const latest = new Map<string, AvailabilityChangedEvent>();
  for (const change of changes) latest.set(change.workerId, change);
  const unique = [...latest.values()];
  if (unique.length === 0) return null;
  if (unique.length > 1) {
    return `Availability changed for ${unique.length} support workers in your results.`;
  }
  const [change] = unique;
  if (!change) return null;
  switch (change.status) {
    case 'AVAILABLE':
      return `${change.workerDisplayName} is available for this support session.`;
    case 'TENTATIVE':
      return `${change.workerDisplayName} is on hold and can't be selected right now.`;
    case 'BOOKED':
    case 'UNAVAILABLE':
      return `${change.workerDisplayName} is no longer available for this support session.`;
  }
}
