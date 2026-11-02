import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiError,
  BookingResponse,
  CreateBookingRequest,
  SupportRequest,
} from '@acf/contracts';
import { FEATURED_WORKER_IDS } from '../../src/db/seed';
import { createHarness, idempotencyKey, searchAllPages, type Harness } from './harness';

let harness: Harness;
beforeAll(async () => {
  harness = await createHarness();
});
afterAll(async () => harness.close());
beforeEach(async () => harness.reset());

const ameliaRequest: CreateBookingRequest = {
  supportRequestId: 'support_demo_001',
  workerId: FEATURED_WORKER_IDS.amelia,
  availabilitySlotId: 'availability_017',
  availabilityVersion: 41,
};

function book(body: CreateBookingRequest, key = idempotencyKey()) {
  return harness.app.inject({
    method: 'POST',
    url: '/api/replacement-bookings',
    headers: { 'idempotency-key': key },
    payload: body,
  });
}

describe('POST /api/replacement-bookings', () => {
  it('books the slot, closes the support request and prices the session', async () => {
    const response = await book(ameliaRequest);
    expect(response.statusCode).toBe(201);
    expect(response.headers['idempotent-replayed']).toBe('false');
    const booking = response.json<BookingResponse>();
    expect(booking).toMatchObject({
      status: 'CONFIRMED',
      worker: { id: FEATURED_WORKER_IDS.amelia, firstName: 'Amelia', lastInitial: 'R' },
      hourlyRateCents: 5800,
      estimatedTotalCents: 17400, // 3 hours × $58.00
    });

    const request = await harness.app.inject('/api/support-requests/support_demo_001');
    expect(request.json<SupportRequest>()).toMatchObject({
      status: 'REPLACEMENT_BOOKED',
      replacementBookingId: booking.id,
    });

    // The booked worker no longer appears as available.
    const { ids } = await searchAllPages(harness.app);
    expect(ids).not.toContain(FEATURED_WORKER_IDS.amelia);

    const fetched = await harness.app.inject(`/api/bookings/${booking.id}`);
    expect(fetched.json<BookingResponse>()).toEqual(booking);
  });

  it('returns 409 WORKER_NO_LONGER_AVAILABLE for a stale availability version', async () => {
    await harness.app.inject({
      method: 'POST',
      url: '/api/demo/availability/availability_017',
      payload: { status: 'AVAILABLE', broadcast: false }, // still "available", but version 42
    });
    const response = await book(ameliaRequest);
    expect(response.statusCode).toBe(409);
    expect(response.json<ApiError>()).toMatchObject({
      code: 'WORKER_NO_LONGER_AVAILABLE',
      message: 'This worker is no longer available for that support session.',
    });
    // Nothing was written.
    const request = await harness.app.inject('/api/support-requests/support_demo_001');
    expect(request.json<SupportRequest>().status).toBe('CANCELLED_NEEDS_REPLACEMENT');
  });

  it('lets exactly one of two simultaneous customers book the same slot', async () => {
    // Real concurrency against Postgres: two transactions race on the same row.
    const [first, second] = await Promise.all([book(ameliaRequest), book(ameliaRequest)]);
    const statuses = [first.statusCode, second.statusCode].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('replays the original booking for a retried Idempotency-Key', async () => {
    const key = idempotencyKey();
    const original = await book(ameliaRequest, key);
    const retry = await book(ameliaRequest, key);
    expect(original.statusCode).toBe(201);
    expect(retry.statusCode).toBe(200);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.json<BookingResponse>().id).toBe(original.json<BookingResponse>().id);
  });

  it('handles simultaneous retries of the same key as one booking', async () => {
    const key = idempotencyKey();
    const [a, b] = await Promise.all([book(ameliaRequest, key), book(ameliaRequest, key)]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 201]);
    expect(a.json<BookingResponse>().id).toBe(b.json<BookingResponse>().id);
  });

  it('rejects reuse of a key for a different booking with 422', async () => {
    const key = idempotencyKey();
    await book(ameliaRequest, key);
    const response = await book(
      {
        ...ameliaRequest,
        workerId: FEATURED_WORKER_IDS.james,
        availabilitySlotId: 'availability_009',
        availabilityVersion: 7,
      },
      key,
    );
    expect(response.statusCode).toBe(422);
    expect(response.json<ApiError>().code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('returns 409 BOOKING_CONFLICT once the session already has a replacement', async () => {
    await book(ameliaRequest);
    const response = await book({
      ...ameliaRequest,
      workerId: FEATURED_WORKER_IDS.james,
      availabilitySlotId: 'availability_009',
      availabilityVersion: 7,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json<ApiError>().code).toBe('BOOKING_CONFLICT');
  });

  it('requires an Idempotency-Key header', async () => {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/replacement-bookings',
      payload: ameliaRequest,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<ApiError>().code).toBe('VALIDATION_ERROR');
  });

  it("refuses a slot that doesn't belong to the worker", async () => {
    const response = await book({ ...ameliaRequest, availabilitySlotId: 'availability_009' });
    expect(response.statusCode).toBe(404);
  });
});
