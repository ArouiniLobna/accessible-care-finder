import { describe, expect, it } from 'vitest';
import type {
  AvailabilityChangedEvent,
  SearchWorkersResponse,
  WorkerSummary,
} from '@acf/contracts';
import {
  describeAvailabilityChanges,
  parseAvailabilityEvent,
  patchSearchPages,
  patchWorkerProfile,
} from './apply-availability-change';

const worker = (id: string, version: number, slotId = `availability_${id}`): WorkerSummary => ({
  id,
  firstName: 'Amelia',
  lastInitial: 'R',
  verified: true,
  rating: 4.9,
  reviewCount: 42,
  hourlyRateCents: 5800,
  distanceKm: 2.4,
  services: [],
  languages: [],
  hasTransport: true,
  availability: { slotId, status: 'AVAILABLE', version },
});

const page = (items: WorkerSummary[]): SearchWorkersResponse => ({
  items,
  nextCursor: null,
  meta: { resultCount: items.length, generatedAt: '2026-11-01T00:00:00.000Z' },
});

const event = (overrides: Partial<AvailabilityChangedEvent> = {}): AvailabilityChangedEvent => ({
  eventId: 'b-1',
  workerId: 'w17',
  workerDisplayName: 'Amelia R.',
  slotId: 'availability_w17',
  status: 'UNAVAILABLE',
  version: 42,
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

describe('patchSearchPages', () => {
  const data = {
    pages: [page([worker('w1', 3)]), page([worker('w17', 41)])],
    pageParams: [null, 'c'],
  };

  it('updates only the affected worker on the affected page', () => {
    const next = patchSearchPages(data, event());
    expect(next.pages[1]?.items[0]?.availability).toEqual({
      slotId: 'availability_w17',
      status: 'UNAVAILABLE',
      version: 42,
    });
    expect(next.pages[0]).toBe(data.pages[0]); // untouched page keeps identity
  });

  it('ignores stale or duplicate events (version not newer)', () => {
    expect(patchSearchPages(data, event({ version: 41 }))).toBe(data);
    const once = patchSearchPages(data, event());
    expect(patchSearchPages(once, event())).toBe(once);
  });

  it('ignores events for a different slot of the same worker', () => {
    expect(patchSearchPages(data, event({ slotId: 'availability_w17_d1' }))).toBe(data);
  });
});

describe('patchWorkerProfile', () => {
  it('patches the matched slot only', () => {
    const profile = {
      id: 'w17',
      firstName: 'Amelia',
      lastInitial: 'R',
      bio: '',
      verified: true,
      rating: 4.9,
      reviewCount: 42,
      hourlyRateCents: 5800,
      yearsExperience: 8,
      suburb: 'North Parramatta',
      hasTransport: true,
      services: [],
      languages: [],
      match: {
        supportRequestId: 's',
        distanceKm: 2.4,
        availability: { slotId: 'availability_w17', status: 'AVAILABLE' as const, version: 41 },
      },
    };
    expect(patchWorkerProfile(profile, event()).match?.availability?.status).toBe('UNAVAILABLE');
    expect(patchWorkerProfile(profile, event({ workerId: 'other' }))).toBe(profile);
  });
});

describe('parseAvailabilityEvent', () => {
  it('accepts a valid payload and rejects anything else', () => {
    expect(parseAvailabilityEvent(JSON.stringify(event()))).toEqual(event());
    expect(parseAvailabilityEvent('{bad json')).toBeNull();
    expect(parseAvailabilityEvent(JSON.stringify({ ...event(), status: 'GONE' }))).toBeNull();
  });
});

describe('describeAvailabilityChanges', () => {
  it('names a single worker in plain language', () => {
    expect(describeAvailabilityChanges([event()])).toBe(
      'Amelia R. is no longer available for this support session.',
    );
  });

  it('summarises bursts instead of flooding the screen reader', () => {
    expect(
      describeAvailabilityChanges([event(), event({ workerId: 'w2' }), event({ workerId: 'w3' })]),
    ).toBe('Availability changed for 3 support workers in your results.');
  });

  it('collapses repeated changes to the same worker', () => {
    expect(
      describeAvailabilityChanges([event(), event({ status: 'AVAILABLE', version: 43 })]),
    ).toBe('Amelia R. is available for this support session.');
  });
});
