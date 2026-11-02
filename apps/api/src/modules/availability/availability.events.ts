import { randomUUID } from 'node:crypto';
import type { AvailabilityChangedEvent } from '@acf/contracts';
import { SSE_EVENTS } from '@acf/contracts/constants';

/**
 * In-process publish/subscribe for availability changes, streamed to browsers over SSE.
 *
 * Single-node by design. In a horizontally scaled deployment, an event published on instance A
 * would never reach clients connected to instance B; cross-instance propagation would need
 * shared infrastructure (e.g. Postgres LISTEN/NOTIFY, Redis pub/sub or a message broker).
 * This demo intentionally does not introduce that complexity.
 *
 * Event ids are `<bootId>-<sequence>`. A reconnecting EventSource sends `Last-Event-ID`; if it
 * came from this process and the gap is still in the replay buffer we replay it, otherwise we
 * tell the client to resync (refetch). Clients also refetch after any reconnect, so a missed
 * event can never leave stale availability on screen indefinitely.
 */

export interface SseClient {
  write(chunk: string): void;
}

type ChangeInput = Omit<AvailabilityChangedEvent, 'eventId'>;

interface BufferedEvent {
  sequence: number;
  payload: AvailabilityChangedEvent;
}

/** Serialise one SSE message. `data` must not contain raw newlines (JSON.stringify ensures it). */
export function formatSseMessage(message: { id?: string; event: string; data: unknown }): string {
  const lines: string[] = [];
  if (message.id !== undefined) lines.push(`id: ${message.id}`);
  lines.push(`event: ${message.event}`);
  lines.push(`data: ${JSON.stringify(message.data)}`);
  return `${lines.join('\n')}\n\n`;
}

export class AvailabilityEventHub {
  readonly bootId = randomUUID().slice(0, 8);
  private readonly clients = new Set<SseClient>();
  private readonly buffer: BufferedEvent[] = [];
  private sequence = 0;
  private heartbeat: NodeJS.Timeout | undefined;

  constructor(private readonly options: { replayBufferSize?: number; heartbeatMs: number }) {}

  get clientCount(): number {
    return this.clients.size;
  }

  publish(change: ChangeInput): AvailabilityChangedEvent {
    this.sequence += 1;
    const payload: AvailabilityChangedEvent = {
      eventId: `${this.bootId}-${this.sequence}`,
      ...change,
    };
    this.buffer.push({ sequence: this.sequence, payload });
    const max = this.options.replayBufferSize ?? 200;
    if (this.buffer.length > max) this.buffer.splice(0, this.buffer.length - max);
    this.broadcast(
      formatSseMessage({
        id: payload.eventId,
        event: SSE_EVENTS.availabilityChanged,
        data: payload,
      }),
    );
    return payload;
  }

  /** Tell every client its cached availability can no longer be trusted (e.g. after a demo reset). */
  publishResync(reason: string): void {
    this.broadcast(formatSseMessage({ event: SSE_EVENTS.availabilityResync, data: { reason } }));
  }

  subscribe(client: SseClient, lastEventId: string | undefined): () => void {
    try {
      // `retry` tells EventSource how long to wait before reconnecting.
      client.write('retry: 3000\n\n');
      if (lastEventId) this.replay(client, lastEventId);
    } catch {
      // The socket died before we finished the handshake; never register it.
      return () => undefined;
    }
    this.clients.add(client);
    this.ensureHeartbeat();
    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0) this.stopHeartbeat();
    };
  }

  close(): void {
    this.stopHeartbeat();
    this.clients.clear();
  }

  private replay(client: SseClient, lastEventId: string): void {
    const [bootId, rawSequence] = lastEventId.split('-');
    const lastSequence = Number(rawSequence);
    const oldestBuffered = this.buffer[0]?.sequence ?? this.sequence + 1;
    const canReplay =
      bootId === this.bootId &&
      Number.isInteger(lastSequence) &&
      lastSequence >= oldestBuffered - 1 &&
      lastSequence <= this.sequence;

    if (!canReplay) {
      client.write(
        formatSseMessage({ event: SSE_EVENTS.availabilityResync, data: { reason: 'gap' } }),
      );
      return;
    }
    for (const event of this.buffer) {
      if (event.sequence > lastSequence) {
        client.write(
          formatSseMessage({
            id: event.payload.eventId,
            event: SSE_EVENTS.availabilityChanged,
            data: event.payload,
          }),
        );
      }
    }
  }

  private broadcast(chunk: string): void {
    for (const client of this.clients) {
      try {
        client.write(chunk);
      } catch {
        // A broken socket is cleaned up by its 'close' handler; never let one client break others.
        this.clients.delete(client);
      }
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => this.broadcast(': heartbeat\n\n'), this.options.heartbeatMs);
    this.heartbeat.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }
}
