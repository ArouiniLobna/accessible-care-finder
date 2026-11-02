import { describe, expect, it } from 'vitest';
import {
  clearOptionalFilters,
  DEFAULT_FILTERS,
  parseFilters,
  serializeFilters,
  toSearchCriteria,
  toSearchRequest,
  widerRadius,
} from './search-criteria';

describe('search filters in the URL', () => {
  it('round-trips through URLSearchParams', () => {
    const filters = {
      radiusKm: 20 as const,
      serviceIds: ['personal-care', 'transport'],
      languageCodes: ['ar', 'en'],
      requireTransport: true,
      maxHourlyRateDollars: 65,
      sort: 'closest' as const,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it('writes nothing for the default search', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('ignores invalid or hostile values instead of failing', () => {
    const parsed = parseFilters(
      new URLSearchParams('radius=7&sort=random&maxRate=-5&languages=ar,<script>,ar&transport=yes'),
    );
    expect(parsed).toEqual({ ...DEFAULT_FILTERS, languageCodes: ['ar'] });
  });
});

describe('normalised search criteria (query keys)', () => {
  it('is identical regardless of selection order', () => {
    const a = toSearchCriteria(
      'support_demo_001',
      { ...DEFAULT_FILTERS, languageCodes: ['ur', 'ar'] },
      ['meal-preparation', 'personal-care'],
    );
    const b = toSearchCriteria(
      'support_demo_001',
      { ...DEFAULT_FILTERS, languageCodes: ['ar', 'ur'] },
      ['personal-care', 'meal-preparation'],
    );
    expect(a).toEqual(b);
  });

  it('inherits the session services unless the customer changed them', () => {
    const criteria = toSearchCriteria('s', DEFAULT_FILTERS, ['personal-care', 'meal-preparation']);
    expect(criteria.requiredServiceIds).toEqual(['meal-preparation', 'personal-care']);
  });

  it('converts dollars to cents and omits unset optional fields from the request', () => {
    const criteria = toSearchCriteria('s', { ...DEFAULT_FILTERS, maxHourlyRateDollars: 60 }, []);
    const request = toSearchRequest(criteria, null);
    expect(request.maxHourlyRateCents).toBe(6000);
    expect(request).not.toHaveProperty('hasTransport');
  });
});

describe('empty-state helpers', () => {
  it('widens the radius step by step', () => {
    expect(widerRadius(5)).toBe(10);
    expect(widerRadius(10)).toBe(20);
    expect(widerRadius(20)).toBeNull();
  });

  it('clears refinements but keeps radius and sort', () => {
    expect(
      clearOptionalFilters({
        ...DEFAULT_FILTERS,
        radiusKm: 20,
        sort: 'closest',
        languageCodes: ['ar'],
        requireTransport: true,
      }),
    ).toEqual({ ...DEFAULT_FILTERS, radiusKm: 20, sort: 'closest' });
  });
});
