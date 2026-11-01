/**
 * Plain runtime constants with no TypeBox dependency.
 *
 * The web app imports runtime values from `@acf/contracts/constants` and only
 * *types* from `@acf/contracts`, so the schema builder never reaches the browser bundle.
 */

export const API_ERROR_CODES = ['VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_ERROR'] as const;

export const REQUEST_ID_HEADER = 'x-request-id';

export const AVAILABILITY_STATUSES = ['AVAILABLE', 'TENTATIVE', 'BOOKED', 'UNAVAILABLE'] as const;

export const SUPPORT_REQUEST_STATUSES = [
  'CANCELLED_NEEDS_REPLACEMENT',
  'REPLACEMENT_BOOKED',
] as const;
