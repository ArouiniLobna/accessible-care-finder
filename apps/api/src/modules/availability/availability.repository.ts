import { sql } from 'drizzle-orm';
import type { AvailabilityStatus } from '@acf/contracts';
import { AVAILABILITY_STATUSES } from '@acf/contracts/constants';
import type { Executor } from '../../db/client';
import { readDate, readNumber, readString } from '../../shared/db-values';

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
  };
}

export type AvailabilityRepository = ReturnType<typeof createAvailabilityRepository>;
