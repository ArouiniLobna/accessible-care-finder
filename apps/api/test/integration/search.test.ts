import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, SupportRequest, WorkerProfile } from '@acf/contracts';
import { SEARCH_SORTS } from '@acf/contracts/constants';
import { FEATURED_WORKER_IDS } from '../../src/db/seed';
import { createHarness, search, searchAllPages, type Harness } from './harness';

let harness: Harness;
beforeAll(async () => {
  harness = await createHarness();
});
afterAll(async () => harness.close());
beforeEach(async () => harness.reset());

describe('GET /health', () => {
  it('reports database connectivity without leaking environment details', async () => {
    const response = await harness.app.inject('/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
  });
});

describe('GET /api/support-requests/:id', () => {
  it('returns the cancelled session with approximate location only', async () => {
    const response = await harness.app.inject('/api/support-requests/support_demo_001');
    expect(response.statusCode).toBe(200);
    const body = response.json<SupportRequest>();
    expect(body).toMatchObject({
      status: 'CANCELLED_NEEDS_REPLACEMENT',
      timezone: 'Australia/Sydney',
      location: { suburb: 'Parramatta', postcode: '2150' },
      startsAt: '2026-11-06T23:00:00.000Z', // 10:00 AEDT on Saturday 7 November
      endsAt: '2026-11-07T02:00:00.000Z',
      replacementBookingId: null,
    });
    expect(body.services.map((s) => s.id)).toEqual(['personal-care', 'meal-preparation']);
    expect(body).not.toHaveProperty('latitude');
  });

  it('returns a typed 404', async () => {
    const response = await harness.app.inject('/api/support-requests/support_missing');
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiError>()).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('POST /api/workers/search', () => {
  it('only returns workers who provide every required service, within the radius, with an AVAILABLE covering slot', async () => {
    const { response, body } = await search(harness.app);
    expect(response.statusCode).toBe(200);
    expect(body.items.length).toBe(12);
    expect(body.meta.resultCount).toBeGreaterThan(12);
    for (const worker of body.items) {
      expect(worker.services.map((s) => s.id)).toEqual(
        expect.arrayContaining(['personal-care', 'meal-preparation']),
      );
      expect(worker.distanceKm).toBeLessThanOrEqual(10);
      expect(worker.availability.status).toBe('AVAILABLE');
    }
  });

  it('includes Amelia with the slot version needed for booking, and excludes non-covering workers', async () => {
    const { ids, items } = await searchAllPages(harness.app);
    const amelia = items.find((w) => w.id === FEATURED_WORKER_IDS.amelia);
    expect(amelia).toMatchObject({
      firstName: 'Amelia',
      lastInitial: 'R',
      distanceKm: 2.4,
      hourlyRateCents: 5800,
      availability: { slotId: 'availability_017', status: 'AVAILABLE', version: 41 },
    });
    // Sofia's slot is UNAVAILABLE; Aisha is available but only from 11:00.
    expect(ids).not.toContain(FEATURED_WORKER_IDS.sofia);
    expect(ids).not.toContain(FEATURED_WORKER_IDS.aisha);
  });

  it('does not expose internal database fields', async () => {
    const { body } = await search(harness.app, { limit: 1 });
    expect(Object.keys(body.items[0] ?? {}).sort()).toEqual(
      [
        'availability',
        'distanceKm',
        'firstName',
        'hasTransport',
        'hourlyRateCents',
        'id',
        'languages',
        'lastInitial',
        'rating',
        'reviewCount',
        'services',
        'verified',
      ].sort(),
    );
  });

  it('applies optional filters on the server', async () => {
    const arabic = await searchAllPages(harness.app, { languageCodes: ['ar'] });
    expect(arabic.items.every((w) => w.languages.some((l) => l.code === 'ar'))).toBe(true);

    const transport = await searchAllPages(harness.app, { hasTransport: true });
    expect(transport.items.every((w) => w.hasTransport)).toBe(true);

    const cheap = await searchAllPages(harness.app, { maxHourlyRateCents: 5500 });
    expect(cheap.items.every((w) => w.hourlyRateCents <= 5500)).toBe(true);

    const wider = await searchAllPages(harness.app, { radiusKm: 20 });
    const narrower = await searchAllPages(harness.app, { radiusKm: 5 });
    expect(wider.resultCount).toBeGreaterThan(narrower.resultCount);
  });

  it.each(SEARCH_SORTS)(
    'paginates "%s" with a cursor: complete, no duplicates, deterministic',
    async (sort) => {
      const all = await searchAllPages(harness.app, { sort, limit: 5 });
      expect(all.pages).toBeGreaterThan(1);
      expect(new Set(all.ids).size).toBe(all.ids.length);
      expect(all.ids.length).toBe(all.resultCount);
      // Same query again yields the same order.
      const again = await searchAllPages(harness.app, { sort, limit: 7 });
      expect(again.ids).toEqual(all.ids);
    },
  );

  it('orders "closest" by distance and "lowest_rate" by price', async () => {
    const closest = await searchAllPages(harness.app, { sort: 'closest' });
    const distances = closest.items.map((w) => w.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));

    const cheapest = await searchAllPages(harness.app, { sort: 'lowest_rate' });
    const rates = cheapest.items.map((w) => w.hourlyRateCents);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
  });

  it('rejects malformed cursors and cursors from another sort with INVALID_CURSOR', async () => {
    const garbage = await search(harness.app, { cursor: 'definitely-not-a-cursor' });
    expect(garbage.response.statusCode).toBe(400);
    expect(garbage.body).toMatchObject({ code: 'INVALID_CURSOR' });

    const first = await search(harness.app, { sort: 'closest' });
    const mismatched = await search(harness.app, {
      sort: 'lowest_rate',
      cursor: first.body.nextCursor,
    });
    expect(mismatched.response.statusCode).toBe(400);
  });

  it('maps schema violations to a stable VALIDATION_ERROR envelope', async () => {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/workers/search',
      payload: { supportRequestId: 'support_demo_001', radiusKm: 7 },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json<ApiError>();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBeTruthy();
    expect(body.fieldErrors).toBeDefined();
    expect(JSON.stringify(body)).not.toMatch(/stack|ajv|instancePath/i);
  });

  it('rejects unknown services and languages', async () => {
    const { response, body } = await search(harness.app, { languageCodes: ['xx'] });
    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: { languageCodes: expect.any(String) },
    });
  });

  it('returns an empty, well-formed page when nothing matches', async () => {
    const { response, body } = await search(harness.app, { maxHourlyRateCents: 1000 });
    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ items: [], nextCursor: null, meta: { resultCount: 0 } });
  });
});

describe('GET /api/workers/:id', () => {
  it('returns the profile with session match details', async () => {
    const response = await harness.app.inject(
      `/api/workers/${FEATURED_WORKER_IDS.amelia}?supportRequestId=support_demo_001`,
    );
    expect(response.statusCode).toBe(200);
    expect(response.json<WorkerProfile>()).toMatchObject({
      firstName: 'Amelia',
      match: { distanceKm: 2.4, availability: { slotId: 'availability_017', version: 41 } },
    });
  });

  it('shows a non-available covering slot rather than hiding it', async () => {
    const response = await harness.app.inject(
      `/api/workers/${FEATURED_WORKER_IDS.sofia}?supportRequestId=support_demo_001`,
    );
    expect(response.json<WorkerProfile>().match?.availability?.status).toBe('UNAVAILABLE');
  });
});
