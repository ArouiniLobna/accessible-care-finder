import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AvailabilityChangedEvent } from '@acf/contracts';
import { createHarness, idempotencyKey, type Harness } from './harness';

let harness: Harness;
let baseUrl: string;

beforeAll(async () => {
  harness = await createHarness();
  baseUrl = await harness.app.listen({ host: '127.0.0.1', port: 0 });
});
afterAll(async () => harness.close());
beforeEach(async () => harness.reset());

/** Open the SSE stream over real HTTP and collect parsed `availability.changed` events. */
async function openStream() {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/api/events/availability`, { signal: controller.signal });
  if (!response.body) throw new Error('no body');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  const events: AvailabilityChangedEvent[] = [];

  async function next(timeoutMs = 3000): Promise<AvailabilityChangedEvent> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        if (block.includes('event: availability.changed')) {
          const data = block.split('\n').find((line) => line.startsWith('data: '));
          if (data) events.push(JSON.parse(data.slice(6)) as AvailabilityChangedEvent);
        }
      }
      const event = events.shift();
      if (event) return event;
      if (Date.now() > deadline) throw new Error('timed out waiting for SSE event');
      const { value, done } = await reader.read();
      if (done) throw new Error('stream ended');
      buffer += value;
    }
  }
  return { response, next, close: () => controller.abort() };
}

describe('GET /api/events/availability (SSE)', () => {
  it('streams text/event-stream and pushes a demo availability change', async () => {
    const stream = await openStream();
    try {
      expect(stream.response.headers.get('content-type')).toContain('text/event-stream');
      const change = await fetch(`${baseUrl}/api/demo/availability/availability_017`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'UNAVAILABLE' }),
      });
      expect(change.status).toBe(200);
      expect(await stream.next()).toMatchObject({
        workerId: 'worker_017',
        workerDisplayName: 'Amelia R.',
        slotId: 'availability_017',
        status: 'UNAVAILABLE',
        version: 42,
      });
    } finally {
      stream.close();
    }
  });

  it('announces a committed booking (BOOKED) to other clients', async () => {
    const stream = await openStream();
    try {
      const booking = await fetch(`${baseUrl}/api/replacement-bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify({
          supportRequestId: 'support_demo_001',
          workerId: 'worker_017',
          availabilitySlotId: 'availability_017',
          availabilityVersion: 41,
        }),
      });
      expect(booking.status).toBe(201);
      expect(await stream.next()).toMatchObject({
        slotId: 'availability_017',
        status: 'BOOKED',
        version: 42,
      });
    } finally {
      stream.close();
    }
  });
});

describe('demo routes', () => {
  it('lists the featured workers first', async () => {
    const response = await harness.app.inject('/api/demo/availability');
    const body = response.json<{ slots: { workerDisplayName: string }[] }>();
    expect(body.slots.slice(0, 3).map((s) => s.workerDisplayName)).toEqual([
      'Amelia R.',
      'Sofia K.',
      'James T.',
    ]);
  });

  it('can simulate search failures for error-state demos', async () => {
    await harness.app.inject({
      method: 'PUT',
      url: '/api/demo/faults',
      payload: { searchFailure: true },
    });
    const failed = await harness.app.inject({
      method: 'POST',
      url: '/api/workers/search',
      payload: {
        supportRequestId: 'support_demo_001',
        radiusKm: 10,
        requiredServiceIds: [],
        languageCodes: [],
        sort: 'recommended',
        cursor: null,
        limit: 12,
      },
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(failed.body).not.toContain('Simulated');
  });

  it('does not exist when ENABLE_DEMO_CONTROLS is false', async () => {
    const locked = await createHarness({ ENABLE_DEMO_CONTROLS: 'false' });
    try {
      const response = await locked.app.inject('/api/demo/availability');
      expect(response.statusCode).toBe(404);
    } finally {
      await locked.close();
    }
  });
});
