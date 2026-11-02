import { sql } from 'drizzle-orm';
import { AVAILABILITY_STATUSES } from '@acf/contracts/constants';
import type { Executor } from '../../db/client';
import type { AvailabilityStatus, DemoSlot } from '@acf/contracts';
import { readBoolean, readDate, readNumber, readString } from '../../shared/db-values';

/** A slot that just changed: what other browsers need to hear about (Step 9). */
export interface ChangedSlot {
  slotId: string;
  workerId: string;
  workerDisplayName: string;
  status: AvailabilityStatus;
  version: number;
  updatedAt: Date;
}

function parseStatus(value: string): AvailabilityStatus {
  const status = AVAILABILITY_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new Error(`Unknown availability status "${value}"`);
  return status;
}

function toChangedSlot(row: Record<string, unknown>): ChangedSlot {
  return {
    slotId: readString(row, 'id'),
    workerId: readString(row, 'worker_id'),
    workerDisplayName: `${readString(row, 'first_name')} ${readString(row, 'last_initial')}.`,
    status: parseStatus(readString(row, 'status')),
    version: readNumber(row, 'version'),
    updatedAt: readDate(row, 'updated_at'),
  };
}

export function createAvailabilityRepository(db: Executor) {
  return {
    /**
     * Optimistic-concurrency claim: succeeds only if the slot still belongs to the worker, is
     * still AVAILABLE, still has the version the customer saw, and still covers the session.
     * Concurrent claims serialise on the row lock; the loser re-evaluates the WHERE clause
     * against the committed row, matches nothing, and gets `null`.
     */
    async claimForBooking(input: {
      slotId: string;
      workerId: string;
      expectedVersion: number;
      supportRequestId: string;
    }): Promise<ChangedSlot | null> {
      const result = await db.execute(sql`
        WITH claimed AS (
          UPDATE availability_slots a
          SET status = 'BOOKED', version = a.version + 1, updated_at = now()
          FROM support_requests r
          WHERE a.id = ${input.slotId}
            AND a.worker_id = ${input.workerId}
            AND a.status = 'AVAILABLE'
            AND a.version = ${input.expectedVersion}
            AND r.id = ${input.supportRequestId}
            AND a.starts_at <= r.starts_at
            AND a.ends_at >= r.ends_at
          RETURNING a.id, a.worker_id, a.status, a.version, a.updated_at
        )
        SELECT claimed.*, w.first_name, w.last_initial
        FROM claimed JOIN workers w ON w.id = claimed.worker_id
      `);
      const row = result.rows[0];
      return row ? toChangedSlot(row) : null;
    },

    async slotBelongsToWorker(slotId: string, workerId: string): Promise<boolean> {
      const result = await db.execute(sql`
        SELECT 1 FROM availability_slots WHERE id = ${slotId} AND worker_id = ${workerId}
      `);
      return result.rows.length > 0;
    },
    /** Demo only: force a slot's status and bump its version, as another customer would. */
    async setStatus(slotId: string, status: AvailabilityStatus): Promise<ChangedSlot | null> {
      const result = await db.execute(sql`
        WITH changed AS (
          UPDATE availability_slots
          SET status = ${status}, version = version + 1, updated_at = now()
          WHERE id = ${slotId}
          RETURNING id, worker_id, status, version, updated_at
        )
        SELECT changed.*, w.first_name, w.last_initial
        FROM changed JOIN workers w ON w.id = changed.worker_id
      `);
      const row = result.rows[0];
      return row ? toChangedSlot(row) : null;
    },

    /** Demo only: every slot on the demo session's day, featured workers first. */
    async listSlotsForSessionDay(
      supportRequestId: string,
      featuredWorkerIds: readonly string[],
    ): Promise<DemoSlot[]> {
      const result = await db.execute(sql`
        SELECT
          a.id, a.worker_id, a.starts_at, a.ends_at, a.status, a.version,
          w.first_name, w.last_initial,
          (a.starts_at <= r.starts_at AND a.ends_at >= r.ends_at) AS covers
        FROM support_requests r
        JOIN availability_slots a
          ON a.starts_at < r.ends_at + interval '12 hours'
         AND a.ends_at > r.starts_at - interval '12 hours'
        JOIN workers w ON w.id = a.worker_id
        WHERE r.id = ${supportRequestId}
        ORDER BY
          array_position(ARRAY[${sql.join(
            featuredWorkerIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::text[], a.worker_id) NULLS LAST,
          w.first_name, a.worker_id
      `);
      return result.rows.map((row) => ({
        slotId: readString(row, 'id'),
        workerId: readString(row, 'worker_id'),
        workerDisplayName: `${readString(row, 'first_name')} ${readString(row, 'last_initial')}.`,
        startsAt: readDate(row, 'starts_at').toISOString(),
        endsAt: readDate(row, 'ends_at').toISOString(),
        status: parseStatus(readString(row, 'status')),
        version: readNumber(row, 'version'),
        coversDemoSession: readBoolean(row, 'covers'),
      }));
    },
  };
}

export type AvailabilityRepository = ReturnType<typeof createAvailabilityRepository>;
