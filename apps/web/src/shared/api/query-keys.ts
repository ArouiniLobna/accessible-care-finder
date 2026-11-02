import type { SearchCriteria } from '../../features/replacement-search/model/search-criteria';

/**
 * Every server-state cache entry is addressed through these factories, so invalidation and
 * SSE patching can target families (`queryKeys.workerSearches()`) without string guessing.
 * Search keys contain *normalised* criteria (sorted arrays, explicit nulls): equal searches
 * share a cache entry no matter how the filters were clicked into place.
 */
export const queryKeys = {
  supportRequests: () => ['support-requests'] as const,
  supportRequest: (id: string) => ['support-requests', id] as const,

  workers: () => ['workers'] as const,
  workerSearches: () => ['workers', 'search'] as const,
  workerSearch: (criteria: SearchCriteria) => ['workers', 'search', criteria] as const,
  workerProfiles: () => ['workers', 'profile'] as const,
  workerProfile: (workerId: string, supportRequestId: string | null) =>
    ['workers', 'profile', workerId, supportRequestId] as const,

  services: () => ['metadata', 'services'] as const,
  languages: () => ['metadata', 'languages'] as const,
};
