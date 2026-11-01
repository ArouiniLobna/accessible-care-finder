import { sql } from 'drizzle-orm';
import type { SupportRequest } from '@acf/contracts';
import { SUPPORT_REQUEST_STATUSES } from '@acf/contracts/constants';
import type { Executor } from '../../db/client';
import {
  parseService,
  readDate,
  readJsonArray,
  readNumber,
  readString,
} from '../../shared/db-values';

/** Internal shape: includes coordinates, which are never sent to the browser. */
export interface SupportRequestRecord extends SupportRequest {
  latitude: number;
  longitude: number;
}

function parseStatus(value: string): SupportRequest['status'] {
  const status = SUPPORT_REQUEST_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new Error(`Unknown support request status "${value}"`);
  return status;
}

export function createSupportRequestRepository(db: Executor) {
  return {
    async findById(id: string): Promise<SupportRequestRecord | null> {
      const result = await db.execute(sql`
        SELECT
          r.id, r.status, r.timezone, r.starts_at, r.ends_at, r.suburb, r.postcode,
          r.latitude, r.longitude,
          (SELECT json_agg(json_build_object('id', sv.slug, 'name', sv.name) ORDER BY sv.id)
             FROM support_request_services rs JOIN services sv ON sv.id = rs.service_id
             WHERE rs.support_request_id = r.id) AS services
        FROM support_requests r
        WHERE r.id = ${id}
      `);
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: readString(row, 'id'),
        status: parseStatus(readString(row, 'status')),
        timezone: readString(row, 'timezone'),
        startsAt: readDate(row, 'starts_at').toISOString(),
        endsAt: readDate(row, 'ends_at').toISOString(),
        location: { suburb: readString(row, 'suburb'), postcode: readString(row, 'postcode') },
        services: readJsonArray(row, 'services', parseService),
        latitude: readNumber(row, 'latitude'),
        longitude: readNumber(row, 'longitude'),
      };
    },
  };
}

export type SupportRequestRepository = ReturnType<typeof createSupportRequestRepository>;
