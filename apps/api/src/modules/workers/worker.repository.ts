import { sql, type SQL } from 'drizzle-orm';
import type { SearchSort, SlotAvailability, WorkerProfile, WorkerSummary } from '@acf/contracts';
import { AVAILABILITY_STATUSES } from '@acf/contracts/constants';
import type { Executor } from '../../db/client';
import {
  parseLanguage,
  parseService,
  readBoolean,
  readJsonArray,
  readNullableString,
  readNumber,
  readSortKey,
  readString,
  roundKm,
} from '../../shared/db-values';
import type { SearchCursor } from './search-cursor';

export interface SearchCriteria {
  supportRequestId: string;
  radiusKm: number;
  requiredServiceSlugs: readonly string[];
  languageCodes: readonly string[];
  requireTransport: boolean;
  maxHourlyRateCents: number | null;
  sort: SearchSort;
  cursor: SearchCursor | null;
  limit: number;
}

export interface SearchRow {
  worker: WorkerSummary;
  /** Exact sort-key values for building the next cursor. */
  sortKeys: string[];
}

/** `ARRAY[$1, $2]::text[]` with each value bound as a parameter (never interpolated). */
function textArray(values: readonly string[]): SQL {
  if (values.length === 0) return sql`ARRAY[]::text[]`;
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
}

/** Haversine distance in km between a worker row `w` and request row `r`, in SQL. */
const DISTANCE_KM = sql`round((2 * 6371 * asin(least(1.0, sqrt(
    power(sin(radians(w.latitude - r.latitude) / 2), 2)
    + cos(radians(r.latitude)) * cos(radians(w.latitude))
    * power(sin(radians(w.longitude - r.longitude) / 2), 2)
  ))))::numeric, 4)`;

/**
 * "Recommended" is deliberately simple and explainable:
 *   rating × 20  −  distance_km × 2  +  min(review_count, 50) × 0.2  +  5 if verified
 * It uses only service quality, proximity and verification — never personal characteristics.
 */
const RECOMMENDED_SCORE = sql`round(c.rating * 20 - c.distance_km * 2
    + least(c.review_count, 50) * 0.2 + CASE WHEN c.verified THEN 5 ELSE 0 END, 4)`;

/**
 * Each sort has a deterministic ORDER BY (worker id is the final tie-breaker) and a matching
 * keyset predicate. Only these fixed fragments are ever placed in the query; user input is bound.
 */
const SORTS: Record<
  SearchSort,
  { orderBy: SQL; keyColumns: string[]; after: (cursor: SearchCursor) => SQL }
> = {
  recommended: {
    orderBy: sql`recommended_score DESC, id ASC`,
    keyColumns: ['recommended_score'],
    after: ({ keys: [score], id }) =>
      sql`(recommended_score < ${score}::numeric OR (recommended_score = ${score}::numeric AND id > ${id}))`,
  },
  closest: {
    orderBy: sql`distance_km ASC, id ASC`,
    keyColumns: ['distance_km'],
    after: ({ keys: [distance], id }) => sql`(distance_km, id) > (${distance}::numeric, ${id})`,
  },
  highest_rated: {
    orderBy: sql`rating DESC, review_count DESC, id ASC`,
    keyColumns: ['rating', 'review_count'],
    after: ({ keys: [rating, reviews], id }) => sql`(
      rating < ${rating}::numeric
      OR (rating = ${rating}::numeric AND review_count < ${reviews}::int)
      OR (rating = ${rating}::numeric AND review_count = ${reviews}::int AND id > ${id})
    )`,
  },
  lowest_rate: {
    orderBy: sql`hourly_rate_cents ASC, id ASC`,
    keyColumns: ['hourly_rate_cents'],
    after: ({ keys: [rate], id }) => sql`(hourly_rate_cents, id) > (${rate}::int, ${id})`,
  },
};

function parseAvailabilityStatus(value: string): SlotAvailability['status'] {
  const status = AVAILABILITY_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new Error(`Unknown availability status "${value}"`);
  return status;
}

export function createWorkerRepository(db: Executor) {
  return {
    /**
     * One round trip: filtering, distance, availability coverage, total count, keyset page and
     * aggregated services/languages for the returned rows. No per-worker queries (no N+1).
     */
    async search(
      criteria: SearchCriteria,
    ): Promise<{ rows: SearchRow[]; total: number; hasMore: boolean }> {
      const sort = SORTS[criteria.sort];
      const cursorPredicate = criteria.cursor ? sort.after(criteria.cursor) : sql`true`;

      const result = await db.execute(sql`
        WITH request AS (
          SELECT starts_at, ends_at, latitude, longitude
          FROM support_requests WHERE id = ${criteria.supportRequestId}
        ),
        candidates AS (
          SELECT
            w.id, w.first_name, w.last_initial, w.verified, w.rating, w.review_count,
            w.hourly_rate_cents, w.has_transport,
            ${DISTANCE_KM} AS distance_km,
            slot.id AS slot_id, slot.status AS slot_status, slot.version AS slot_version
          FROM workers w
          CROSS JOIN request r
          -- Only an AVAILABLE slot that covers the entire session counts as available.
          JOIN LATERAL (
            SELECT a.id, a.status, a.version
            FROM availability_slots a
            WHERE a.worker_id = w.id
              AND a.status = 'AVAILABLE'
              AND a.starts_at <= r.starts_at
              AND a.ends_at >= r.ends_at
            ORDER BY a.starts_at
            LIMIT 1
          ) slot ON true
          WHERE (
              SELECT count(*) FROM worker_services ws
              JOIN services sv ON sv.id = ws.service_id
              WHERE ws.worker_id = w.id AND sv.slug = ANY(${textArray(criteria.requiredServiceSlugs)})
            ) = cardinality(${textArray(criteria.requiredServiceSlugs)})
            AND (
              cardinality(${textArray(criteria.languageCodes)}) = 0
              OR EXISTS (
                SELECT 1 FROM worker_languages wl
                JOIN languages l ON l.id = wl.language_id
                WHERE wl.worker_id = w.id AND l.code = ANY(${textArray(criteria.languageCodes)})
              )
            )
            AND (${criteria.requireTransport}::boolean = false OR w.has_transport)
            AND (${criteria.maxHourlyRateCents}::int IS NULL OR w.hourly_rate_cents <= ${criteria.maxHourlyRateCents}::int)
        ),
        filtered AS (
          SELECT c.*, ${RECOMMENDED_SCORE} AS recommended_score
          FROM candidates c
          WHERE c.distance_km <= ${criteria.radiusKm}
        ),
        counted AS (
          SELECT f.*, count(*) OVER () AS total_count FROM filtered f
        )
        SELECT
          counted.*,
          (SELECT json_agg(json_build_object('id', sv.slug, 'name', sv.name) ORDER BY sv.id)
             FROM worker_services ws JOIN services sv ON sv.id = ws.service_id
             WHERE ws.worker_id = counted.id) AS services,
          (SELECT json_agg(json_build_object('code', l.code, 'name', l.name) ORDER BY l.id)
             FROM worker_languages wl JOIN languages l ON l.id = wl.language_id
             WHERE wl.worker_id = counted.id) AS languages
        FROM counted
        WHERE ${cursorPredicate}
        ORDER BY ${sort.orderBy}
        LIMIT ${criteria.limit + 1}
      `);

      const allRows = result.rows;
      const hasMore = allRows.length > criteria.limit;
      const pageRows = allRows.slice(0, criteria.limit);
      // The total comes from the window function, so it is also known on an empty page.
      const total = allRows[0] ? readNumber(allRows[0], 'total_count') : 0;

      return {
        hasMore,
        total,
        rows: pageRows.map((row) => ({
          sortKeys: sort.keyColumns.map((column) => readSortKey(row, column)),
          worker: {
            id: readString(row, 'id'),
            firstName: readString(row, 'first_name'),
            lastInitial: readString(row, 'last_initial'),
            verified: readBoolean(row, 'verified'),
            rating: readNumber(row, 'rating'),
            reviewCount: readNumber(row, 'review_count'),
            hourlyRateCents: readNumber(row, 'hourly_rate_cents'),
            distanceKm: roundKm(readNumber(row, 'distance_km')),
            hasTransport: readBoolean(row, 'has_transport'),
            services: readJsonArray(row, 'services', parseService),
            languages: readJsonArray(row, 'languages', parseLanguage),
            availability: {
              slotId: readString(row, 'slot_id'),
              status: parseAvailabilityStatus(readString(row, 'slot_status')),
              version: readNumber(row, 'slot_version'),
            },
          },
        })),
      };
    },

    /**
     * Worker profile. With a support request, also returns distance and the slot covering the
     * session in whatever state it is (so the profile can say "booked" rather than hide it).
     */
    async findProfile(
      workerId: string,
      supportRequestId: string | null,
    ): Promise<WorkerProfile | null> {
      const result = await db.execute(sql`
        SELECT
          w.id, w.first_name, w.last_initial, w.bio, w.verified, w.rating, w.review_count,
          w.hourly_rate_cents, w.years_experience, w.suburb, w.has_transport,
          (SELECT json_agg(json_build_object('id', sv.slug, 'name', sv.name) ORDER BY sv.id)
             FROM worker_services ws JOIN services sv ON sv.id = ws.service_id
             WHERE ws.worker_id = w.id) AS services,
          (SELECT json_agg(json_build_object('code', l.code, 'name', l.name) ORDER BY l.id)
             FROM worker_languages wl JOIN languages l ON l.id = wl.language_id
             WHERE wl.worker_id = w.id) AS languages,
          r.id AS request_id,
          CASE WHEN r.id IS NULL THEN NULL ELSE ${DISTANCE_KM} END AS distance_km,
          slot.id AS slot_id, slot.status AS slot_status, slot.version AS slot_version
        FROM workers w
        LEFT JOIN support_requests r ON r.id = ${supportRequestId}
        LEFT JOIN LATERAL (
          SELECT a.id, a.status, a.version
          FROM availability_slots a
          WHERE a.worker_id = w.id AND r.id IS NOT NULL
            AND a.starts_at <= r.starts_at AND a.ends_at >= r.ends_at
          LIMIT 1
        ) slot ON true
        WHERE w.id = ${workerId}
      `);
      const row = result.rows[0];
      if (!row) return null;

      const requestId = readNullableString(row, 'request_id');
      const slotId = readNullableString(row, 'slot_id');
      return {
        id: readString(row, 'id'),
        firstName: readString(row, 'first_name'),
        lastInitial: readString(row, 'last_initial'),
        bio: readString(row, 'bio'),
        verified: readBoolean(row, 'verified'),
        rating: readNumber(row, 'rating'),
        reviewCount: readNumber(row, 'review_count'),
        hourlyRateCents: readNumber(row, 'hourly_rate_cents'),
        yearsExperience: readNumber(row, 'years_experience'),
        suburb: readString(row, 'suburb'),
        hasTransport: readBoolean(row, 'has_transport'),
        services: readJsonArray(row, 'services', parseService),
        languages: readJsonArray(row, 'languages', parseLanguage),
        match:
          requestId === null
            ? null
            : {
                supportRequestId: requestId,
                distanceKm: roundKm(readNumber(row, 'distance_km')),
                availability:
                  slotId === null
                    ? null
                    : {
                        slotId,
                        status: parseAvailabilityStatus(readString(row, 'slot_status')),
                        version: readNumber(row, 'slot_version'),
                      },
              },
      };
    },
  };
}

export type WorkerRepository = ReturnType<typeof createWorkerRepository>;
