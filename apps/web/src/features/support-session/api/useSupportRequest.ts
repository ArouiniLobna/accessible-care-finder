import { useQuery } from '@tanstack/react-query';
import type { SupportRequest } from '@acf/contracts';
import { apiRequest } from '../../../shared/api/http';
import { STALE_TIMES } from '../../../shared/api/query-client';
import { queryKeys } from '../../../shared/api/query-keys';

export function supportRequestQuery(id: string) {
  return {
    queryKey: queryKeys.supportRequest(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiRequest<SupportRequest>(`/api/support-requests/${encodeURIComponent(id)}`, { signal }),
    staleTime: STALE_TIMES.supportRequest,
  };
}

export function useSupportRequest(id: string) {
  return useQuery(supportRequestQuery(id));
}
