import { afterEach, describe, expect, it } from 'vitest';
import {
  AvailabilityEventHub,
  formatSseMessage,
} from '../../src/modules/availability/availability.events';

const change = {
  workerId: 'worker_017',
  workerDisplayName: 'Amelia R.',
  slotId: 'availability_017',
  status: 'UNAVAILABLE' as const,
  version: 42,
  updatedAt: '2026-11-01T00:00:00.000Z',
};

function recorder() {
  const chunks: string[] = [];
  return { chunks, client: { write: (chunk: string) => void chunks.push(chunk) } };
}

describe('formatSseMessage', () => {
  it('produces a spec-compliant event block', () => {
    expect(
      formatSseMessage({ id: 'a-1', event: 'availability.changed', data: { x: 'line\nbreak' } }),
    ).toBe('id: a-1\nevent: availability.changed\ndata: {"x":"line\\nbreak"}\n\n');
  });
});

describe('AvailabilityEventHub', () => {
  let hub: AvailabilityEventHub;
  afterEach(() => hub.close());

  it('broadcasts to every subscriber with increasing ids', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000 });
    const a = recorder();
    const b = recorder();
    hub.subscribe(a.client, undefined);
    hub.subscribe(b.client, undefined);
    const first = hub.publish(change);
    const second = hub.publish({ ...change, version: 43 });
    expect(first.eventId).toBe(`${hub.bootId}-1`);
    expect(second.eventId).toBe(`${hub.bootId}-2`);
    expect(a.chunks.join('')).toContain('"version":43');
    expect(b.chunks.join('')).toContain('event: availability.changed');
  });

  it('stops sending after unsubscribe', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000 });
    const a = recorder();
    const unsubscribe = hub.subscribe(a.client, undefined);
    unsubscribe();
    hub.publish(change);
    expect(a.chunks.join('')).not.toContain('availability.changed');
    expect(hub.clientCount).toBe(0);
  });

  it('replays missed events when Last-Event-ID is in the buffer', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000 });
    const first = hub.publish(change);
    hub.publish({ ...change, version: 43 });
    const late = recorder();
    hub.subscribe(late.client, first.eventId);
    const output = late.chunks.join('');
    expect(output).toContain('"version":43');
    expect(output).not.toContain('"version":42');
  });

  it('asks the client to resync when the gap cannot be replayed', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000, replayBufferSize: 1 });
    const first = hub.publish(change);
    hub.publish({ ...change, version: 43 });
    hub.publish({ ...change, version: 44 });
    const late = recorder();
    hub.subscribe(late.client, first.eventId);
    expect(late.chunks.join('')).toContain('event: availability.resync');
  });

  it('asks for a resync when the id came from a previous server process', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000 });
    const late = recorder();
    hub.subscribe(late.client, 'deadbeef-7');
    expect(late.chunks.join('')).toContain('event: availability.resync');
  });

  it('keeps broadcasting when one client throws', () => {
    hub = new AvailabilityEventHub({ heartbeatMs: 60_000 });
    const healthy = recorder();
    hub.subscribe(
      {
        write: () => {
          throw new Error('socket closed');
        },
      },
      undefined,
    );
    hub.subscribe(healthy.client, undefined);
    hub.publish(change);
    expect(healthy.chunks.join('')).toContain('availability.changed');
  });
});
