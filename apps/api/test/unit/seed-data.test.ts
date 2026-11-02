import { describe, expect, it } from 'vitest';
import {
  assertDatasetIntegrity,
  buildSeedDataset,
  FEATURED_WORKER_IDS,
  resolveDemoSessionDate,
} from '../../src/db/seed/seed-data';
import { haversineKm } from '../../src/shared/geo';
import { dayOfWeek } from '../../src/shared/zoned-time';

const sessionDate = { year: 2026, month: 11, day: 7 };

describe('demo session date', () => {
  it('is always a Saturday at least two days away, in Sydney time', () => {
    // Friday 30 Oct 2026, 09:00 Sydney: tomorrow's Saturday is too close, so the next one.
    const date = resolveDemoSessionDate(new Date('2026-10-29T22:00:00Z'));
    expect(dayOfWeek(date)).toBe(6);
    expect(date).toEqual({ year: 2026, month: 11, day: 7 });
  });

  it('can be pinned for screenshots', () => {
    expect(resolveDemoSessionDate(new Date(), '2026-12-05')).toEqual({
      year: 2026,
      month: 12,
      day: 5,
    });
  });
});

describe('seed dataset', () => {
  const dataset = buildSeedDataset(sessionDate);

  it('is deterministic', () => {
    expect(buildSeedDataset(sessionDate)).toEqual(dataset);
  });

  it('has about 60 fictional workers and passes integrity checks', () => {
    expect(dataset.workers).toHaveLength(60);
    expect(() => assertDatasetIntegrity(dataset)).not.toThrow();
  });

  it('stores no contact details or street addresses', () => {
    for (const worker of dataset.workers) {
      expect(Object.keys(worker).sort()).toEqual(
        [
          'bio',
          'firstName',
          'hasTransport',
          'hourlyRateCents',
          'id',
          'languages',
          'lastInitial',
          'latitude',
          'longitude',
          'postcode',
          'rating',
          'reviewCount',
          'services',
          'suburb',
          'verified',
          'yearsExperience',
        ].sort(),
      );
    }
  });

  it('makes Amelia R. a strong, available match ~2.4 km away at version 41', () => {
    const amelia = dataset.workers.find((w) => w.id === FEATURED_WORKER_IDS.amelia);
    const slot = dataset.slots.find((s) => s.workerId === FEATURED_WORKER_IDS.amelia);
    expect(amelia?.firstName).toBe('Amelia');
    expect(amelia?.services).toEqual(expect.arrayContaining(['personal-care', 'meal-preparation']));
    expect(slot).toMatchObject({ status: 'AVAILABLE', version: 41 });
    expect(slot && slot.startsAt <= dataset.supportRequest.startsAt).toBe(true);
    expect(slot && slot.endsAt >= dataset.supportRequest.endsAt).toBe(true);
    expect(amelia && haversineKm(amelia, dataset.supportRequest)).toBeCloseTo(2.4, 1);
  });

  it('detects overlapping slots', () => {
    const [first] = dataset.slots;
    if (!first) throw new Error('expected slots');
    const broken = { ...dataset, slots: [...dataset.slots, { ...first, id: 'dup' }] };
    expect(() => assertDatasetIntegrity(broken)).toThrow(/overlaps/);
  });
});
