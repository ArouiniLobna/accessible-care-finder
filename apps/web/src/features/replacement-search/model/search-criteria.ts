import type { SearchRadiusKm, SearchSort, SearchWorkersRequest } from '@acf/contracts';
import { SEARCH_PAGE_SIZE_DEFAULT, SEARCH_RADII_KM, SEARCH_SORTS } from '@acf/contracts/constants';

/**
 * The customer's refinements, as they live in the URL (shareable, survives reload and the
 * back button, and preserved when a booking attempt fails).
 *
 * Time and location are NOT here: they belong to the support request and the API reads them
 * from there. Required services default to the session's services.
 */
export interface SearchFilters {
  radiusKm: SearchRadiusKm;
  /** null = "the session's services" (the default, not written to the URL). */
  serviceIds: string[] | null;
  languageCodes: string[];
  requireTransport: boolean;
  maxHourlyRateDollars: number | null;
  sort: SearchSort;
}

/** Normalised, cache-key-safe criteria: sorted arrays and explicit nulls. */
export interface SearchCriteria {
  supportRequestId: string;
  radiusKm: SearchRadiusKm;
  requiredServiceIds: string[];
  languageCodes: string[];
  requireTransport: boolean;
  maxHourlyRateCents: number | null;
  sort: SearchSort;
}

export const DEFAULT_FILTERS: SearchFilters = {
  radiusKm: 10,
  serviceIds: null,
  languageCodes: [],
  requireTransport: false,
  maxHourlyRateDollars: null,
  sort: 'recommended',
};

export const MAX_RATE_LIMITS = { min: 30, max: 150 } as const;

const list = (value: string | null) =>
  value
    ? [
        ...new Set(
          value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => /^[a-z0-9-]{1,64}$/.test(item)),
        ),
      ]
    : [];

/** Parse URL params defensively: anything unrecognised falls back to the default. */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const radius = Number(params.get('radius'));
  const sort = params.get('sort');
  const rate = Number(params.get('maxRate'));
  return {
    radiusKm: SEARCH_RADII_KM.find((r) => r === radius) ?? DEFAULT_FILTERS.radiusKm,
    serviceIds: params.has('services') ? list(params.get('services')) : null,
    languageCodes: list(params.get('languages')),
    requireTransport: params.get('transport') === 'true',
    maxHourlyRateDollars:
      Number.isInteger(rate) && rate >= MAX_RATE_LIMITS.min && rate <= MAX_RATE_LIMITS.max
        ? rate
        : null,
    sort: SEARCH_SORTS.find((s) => s === sort) ?? DEFAULT_FILTERS.sort,
  };
}

/** Write only non-default values, so the default search has a clean URL. */
export function serializeFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.radiusKm !== DEFAULT_FILTERS.radiusKm) params.set('radius', String(filters.radiusKm));
  if (filters.serviceIds !== null) params.set('services', [...filters.serviceIds].sort().join(','));
  if (filters.languageCodes.length > 0)
    params.set('languages', [...filters.languageCodes].sort().join(','));
  if (filters.requireTransport) params.set('transport', 'true');
  if (filters.maxHourlyRateDollars !== null)
    params.set('maxRate', String(filters.maxHourlyRateDollars));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  return params;
}

export function toSearchCriteria(
  supportRequestId: string,
  filters: SearchFilters,
  sessionServiceIds: readonly string[],
): SearchCriteria {
  return {
    supportRequestId,
    radiusKm: filters.radiusKm,
    requiredServiceIds: [...(filters.serviceIds ?? sessionServiceIds)].sort(),
    languageCodes: [...filters.languageCodes].sort(),
    requireTransport: filters.requireTransport,
    maxHourlyRateCents:
      filters.maxHourlyRateDollars === null ? null : filters.maxHourlyRateDollars * 100,
    sort: filters.sort,
  };
}

export function toSearchRequest(
  criteria: SearchCriteria,
  cursor: string | null,
): SearchWorkersRequest {
  return {
    supportRequestId: criteria.supportRequestId,
    radiusKm: criteria.radiusKm,
    requiredServiceIds: criteria.requiredServiceIds,
    languageCodes: criteria.languageCodes,
    ...(criteria.requireTransport ? { hasTransport: true } : {}),
    ...(criteria.maxHourlyRateCents === null
      ? {}
      : { maxHourlyRateCents: criteria.maxHourlyRateCents }),
    sort: criteria.sort,
    cursor,
    limit: SEARCH_PAGE_SIZE_DEFAULT,
  };
}

/** Optional refinements cleared, session requirements and radius/sort kept. */
export function clearOptionalFilters(filters: SearchFilters): SearchFilters {
  return { ...DEFAULT_FILTERS, radiusKm: filters.radiusKm, sort: filters.sort };
}

/** Next radius up, or null when already at the widest. */
export function widerRadius(radius: SearchRadiusKm): SearchRadiusKm | null {
  return SEARCH_RADII_KM.find((r) => r > radius) ?? null;
}

export function hasOptionalFilters(filters: SearchFilters): boolean {
  return (
    filters.serviceIds !== null ||
    filters.languageCodes.length > 0 ||
    filters.requireTransport ||
    filters.maxHourlyRateDollars !== null
  );
}
