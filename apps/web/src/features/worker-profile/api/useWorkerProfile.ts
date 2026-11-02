import { useQuery } from '@tanstack/react-query';
import type { WorkerProfile } from '@acf/contracts';
import { apiRequest } from '../../../shared/api/http';
import { STALE_TIMES } from '../../../shared/api/query-client';
import { queryKeys } from '../../../shared/api/query-keys';

/** Profile + (optionally) how the worker matches a support session. Availability is SSE-patched. */
export function useWorkerProfile(workerId: string, supportRequestId: string | null) {
  return useQuery({
    queryKey: queryKeys.workerProfile(workerId, supportRequestId),
    queryFn: ({ signal }) => {
      const query = supportRequestId
        ? `?supportRequestId=${encodeURIComponent(supportRequestId)}`
        : '';
      return apiRequest<WorkerProfile>(`/api/workers/${encodeURIComponent(workerId)}${query}`, {
        signal,
      });
    },
    staleTime: STALE_TIMES.profile,
  });
}
