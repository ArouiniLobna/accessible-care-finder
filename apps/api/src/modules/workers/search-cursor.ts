import type { SearchSort } from '@acf/contracts';
import { SEARCH_SORTS } from '@acf/contracts/constants';
import { AppError } from '../../shared/errors';

/**
 * Keyset-pagination cursor. Opaque to the client (base64url JSON), but it carries exactly the
 * sort-key values of the last row returned, plus the worker-id tie-breaker.
 *
 * Numeric keys are kept as strings so values like `106.5964` round-trip exactly into
 * `::numeric` comparisons — floating-point drift would otherwise skip or repeat rows.
 */
export interface SearchCursor {
  sort: SearchSort;
  keys: string[];
  id: string;
}

const KEY_COUNT: Record<SearchSort, number> = {
  recommended: 1, // recommended_score
  closest: 1, // distance_km
  highest_rated: 2, // rating, review_count
  lowest_rate: 1, // hourly_rate_cents
};

const NUMERIC = /^-?\d{1,9}(\.\d{1,6})?$/;
const WORKER_ID = /^[a-z0-9_-]{1,64}$/;

export function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(
    JSON.stringify({ v: 1, s: cursor.sort, k: cursor.keys, i: cursor.id }),
  ).toString('base64url');
}

const invalid = () =>
  new AppError(
    400,
    'INVALID_CURSOR',
    'These results have expired. Please start the search again from the first page.',
  );

/** @throws AppError(INVALID_CURSOR) for anything that is not a cursor we issued for `sort`. */
export function decodeCursor(raw: string, expectedSort: SearchSort): SearchCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (typeof parsed !== 'object' || parsed === null) throw invalid();
  const { v, s, k, i } = parsed as Record<string, unknown>;
  const sort = SEARCH_SORTS.find((candidate) => candidate === s);
  if (v !== 1 || sort === undefined || sort !== expectedSort) throw invalid();
  if (typeof i !== 'string' || !WORKER_ID.test(i)) throw invalid();
  if (!Array.isArray(k) || k.length !== KEY_COUNT[sort]) throw invalid();
  const keys: string[] = [];
  for (const key of k) {
    if (typeof key !== 'string' || !NUMERIC.test(key)) throw invalid();
    keys.push(key);
  }
  return { sort, keys, id: i };
}
