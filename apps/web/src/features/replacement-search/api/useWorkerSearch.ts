import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { SearchWorkersResponse } from '@acf/contracts';
import { apiRequest } from '../../../shared/api/http';
import { STALE_TIMES } from '../../../shared/api/query-client';
import { queryKeys } from '../../../shared/api/query-keys';
import { toSearchRequest, type SearchCriteria } from '../model/search-criteria';

/**
 * Worker search as an infinite query over keyset cursors.
 *
 * - The query key is the normalised criteria, so identical searches share a cache entry.
 * - `signal` is passed to fetch: when filters change, TanStack Query aborts the superseded
 *   request, so an old response can never overwrite a newer search.
 * - `placeholderData: keepPreviousData` keeps the current results on screen while a new
 *   search loads ("Updating matches…") instead of flashing an empty list.
 * - 30 s freshness: profile fields barely change; availability is patched live via SSE.
 */
export function useWorkerSearch(criteria: SearchCriteria | null) {
  return useInfiniteQuery({
    queryKey: criteria
      ? queryKeys.workerSearch(criteria)
      : [...queryKeys.workerSearches(), 'disabled'],
    queryFn: ({ pageParam, signal }) => {
      if (!criteria) throw new Error('Search criteria are not ready');
      return apiRequest<SearchWorkersResponse>('/api/workers/search', {
        method: 'POST',
        body: toSearchRequest(criteria, pageParam),
        signal,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIMES.search,
    enabled: criteria !== null,
  });
}
