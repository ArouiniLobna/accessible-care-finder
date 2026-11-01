import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { BookingResponse } from '@acf/contracts';
import type { Executor } from '../../db/client';
import {
  parseService,
  readDate,
  readJsonArray,
  readNumber,
  readString,
} from '../../shared/db-values';
import { estimateTotalCents } from '../../shared/money';

export interface BookingIdentity {
  id: string;
  supportRequestId: string;
  workerId: string;
  availabilitySlotId: string;
}

export const newBookingId = () => `booking_${randomUUID().replaceAll('-', '')}`;

export function createBookingRepository(db: Executor) {
  return {
    async findByIdempotencyKey(key: string): Promise<BookingIdentity | null> {
      const result = await db.execute(sql`
        SELECT id, support_request_id, worker_id, availability_slot_id
        FROM bookings WHERE idempotency_key = ${key}
      `);
      const row = result.rows[0];
      return row
        ? {
            id: readString(row, 'id'),
            supportRequestId: readString(row, 'support_request_id'),
            workerId: readString(row, 'worker_id'),
            availabilitySlotId: readString(row, 'availability_slot_id'),
          }
        : null;
    },

    /** Snapshot the worker's current rate into the booking. */
    async insert(input: {
      supportRequestId: string;
      workerId: string;
      availabilitySlotId: string;
      idempotencyKey: string;
    }): Promise<string> {
      const id = newBookingId();
      await db.execute(sql`
        INSERT INTO bookings (id, support_request_id, worker_id, availability_slot_id, hourly_rate_cents, idempotency_key)
        SELECT ${id}, ${input.supportRequestId}, w.id, ${input.availabilitySlotId}, w.hourly_rate_cents, ${input.idempotencyKey}
        FROM workers w WHERE w.id = ${input.workerId}
      `);
      return id;
    },

    async workerProvidesServices(workerId: string, supportRequestId: string): Promise<boolean> {
      const result = await db.execute(sql`
        SELECT NOT EXISTS (
          SELECT 1 FROM support_request_services rs
          WHERE rs.support_request_id = ${supportRequestId}
            AND NOT EXISTS (
              SELECT 1 FROM worker_services ws
              WHERE ws.worker_id = ${workerId} AND ws.service_id = rs.service_id
            )
        ) AS provides
      `);
      return result.rows[0]?.['provides'] === true;
    },

    async findResponse(id: string): Promise<BookingResponse | null> {
      const result = await db.execute(sql`
        SELECT
          b.id, b.support_request_id, b.hourly_rate_cents, b.created_at,
          w.id AS worker_id, w.first_name, w.last_initial,
          r.starts_at, r.ends_at, r.timezone,
          (SELECT json_agg(json_build_object('id', sv.slug, 'name', sv.name) ORDER BY sv.id)
             FROM support_request_services rs JOIN services sv ON sv.id = rs.service_id
             WHERE rs.support_request_id = r.id) AS services
        FROM bookings b
        JOIN workers w ON w.id = b.worker_id
        JOIN support_requests r ON r.id = b.support_request_id
        WHERE b.id = ${id} AND b.status = 'CONFIRMED'
      `);
      const row = result.rows[0];
      if (!row) return null;
      const startsAt = readDate(row, 'starts_at');
      const endsAt = readDate(row, 'ends_at');
      const hourlyRateCents = readNumber(row, 'hourly_rate_cents');
      return {
        id: readString(row, 'id'),
        status: 'CONFIRMED',
        supportRequestId: readString(row, 'support_request_id'),
        worker: {
          id: readString(row, 'worker_id'),
          firstName: readString(row, 'first_name'),
          lastInitial: readString(row, 'last_initial'),
        },
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone: readString(row, 'timezone'),
        services: readJsonArray(row, 'services', parseService),
        hourlyRateCents,
        estimatedTotalCents: estimateTotalCents(hourlyRateCents, startsAt, endsAt),
        createdAt: readDate(row, 'created_at').toISOString(),
      };
    },
  };
}

export type BookingRepository = ReturnType<typeof createBookingRepository>;
