import { QueryClient } from '@tanstack/react-query';
import { isApiRequestError } from './http';

/** Freshness is chosen per query family (see each feature's api/ module); this is the fallback. */
export const STALE_TIMES = {
  supportRequest: 30_000,
  /** Services and languages change on deploys, not during a session. */
  metadata: 60 * 60_000,
} as const;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Retry only failures that might succeed next time: never 4xx.
        retry: (failureCount, error) =>
          failureCount < 2 &&
          !(isApiRequestError(error) && error.status >= 400 && error.status < 500),
        // SSE covers availability; refetch-on-focus would only add network chatter here.
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
