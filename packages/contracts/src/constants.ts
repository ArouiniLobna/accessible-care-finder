/**
 * Plain runtime constants with no TypeBox dependency.
 *
 * The web app imports runtime values from `@acf/contracts/constants` and only
 * *types* from `@acf/contracts`, so the schema builder never reaches the browser bundle.
 */

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'INVALID_CURSOR',
  'WORKER_NO_LONGER_AVAILABLE',
  'BOOKING_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'INTERNAL_ERROR',
] as const;

export const REQUEST_ID_HEADER = 'x-request-id';
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

export const AVAILABILITY_STATUSES = ['AVAILABLE', 'TENTATIVE', 'BOOKED', 'UNAVAILABLE'] as const;

export const SUPPORT_REQUEST_STATUSES = [
  'CANCELLED_NEEDS_REPLACEMENT',
  'REPLACEMENT_BOOKED',
] as const;

export const SEARCH_RADII_KM = [5, 10, 20] as const;

export const SEARCH_SORTS = ['recommended', 'closest', 'highest_rated', 'lowest_rate'] as const;

export const SEARCH_PAGE_SIZE_DEFAULT = 12;
export const SEARCH_PAGE_SIZE_MAX = 50;
