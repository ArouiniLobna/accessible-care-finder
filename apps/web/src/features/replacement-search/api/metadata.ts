import { useQuery } from '@tanstack/react-query';
import type { LanguagesResponse, ServicesResponse } from '@acf/contracts';
import { apiRequest } from '../../../shared/api/http';
import { STALE_TIMES } from '../../../shared/api/query-client';
import { queryKeys } from '../../../shared/api/query-keys';

/** Reference data: long freshness and kept in memory across the session. */
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services(),
    queryFn: ({ signal }) => apiRequest<ServicesResponse>('/api/metadata/services', { signal }),
    select: (response) => response.items,
    staleTime: STALE_TIMES.metadata,
    gcTime: Infinity,
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: queryKeys.languages(),
    queryFn: ({ signal }) => apiRequest<LanguagesResponse>('/api/metadata/languages', { signal }),
    select: (response) => response.items,
    staleTime: STALE_TIMES.metadata,
    gcTime: Infinity,
  });
}
