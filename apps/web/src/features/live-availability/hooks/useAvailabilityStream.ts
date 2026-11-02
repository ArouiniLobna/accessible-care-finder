import { useEffect, useRef, useState } from 'react';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type {
  AvailabilityChangedEvent,
  DemoAvailabilityResponse,
  SearchWorkersResponse,
  WorkerProfile,
} from '@acf/contracts';
import { SSE_EVENTS } from '@acf/contracts/constants';
import { useAnnouncer } from '../../../shared/accessibility/announcer';
import { apiUrl } from '../../../shared/api/http';
import { queryKeys } from '../../../shared/api/query-keys';
import {
  describeAvailabilityChanges,
  parseAvailabilityEvent,
  patchDemoAvailability,
  patchSearchPages,
  patchWorkerProfile,
  searchPagesContainWorker,
} from '../model/apply-availability-change';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'unsupported';

type SearchData = InfiniteData<SearchWorkersResponse, string | null>;

/** Batch window: several changes arriving together become one announcement. */
const ANNOUNCE_BATCH_MS = 750;

/**
 * Normal path — targeted cache patches. Returns whether a *visible* (actively observed) search
 * result or profile changed, which is the only case worth announcing.
 */
function applyEvent(queryClient: QueryClient, event: AvailabilityChangedEvent) {
  const cache = queryClient.getQueryCache();
  let visibleChange = false;
  let knownToAnySearch = false;

  for (const query of cache.findAll({ queryKey: queryKeys.workerSearches() })) {
    const data = query.state.data as SearchData | undefined;
    if (!data) continue;
    if (searchPagesContainWorker(data, event.workerId)) knownToAnySearch = true;
    const next = patchSearchPages(data, event);
    if (next !== data) {
      queryClient.setQueryData(query.queryKey, next);
      if (query.isActive()) visibleChange = true;
    }
  }

  for (const query of cache.findAll({ queryKey: queryKeys.workerProfiles() })) {
    const data = query.state.data as WorkerProfile | undefined;
    if (!data) continue;
    const next = patchWorkerProfile(data, event);
    if (next !== data) {
      queryClient.setQueryData(query.queryKey, next);
      if (query.isActive()) visibleChange = true;
    }
  }

  queryClient.setQueryData<DemoAvailabilityResponse>(queryKeys.demoAvailability(), (data) =>
    data ? patchDemoAvailability(data, event) : data,
  );

  // A worker becoming AVAILABLE may be a *new* match that no cached page contains.
  // Patching can't add them, so refetch the searches on screen (inactive ones go stale).
  if (event.status === 'AVAILABLE' && !knownToAnySearch) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workerSearches(),
      refetchType: 'active',
    });
  }
  return visibleChange;
}

/**
 * Recovery path — after a disconnect we may have missed events, so the cache is no longer
 * trustworthy. Refetch rather than assume.
 */
function reconcile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.workers() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.demoAvailability() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.supportRequests() });
}

/**
 * Subscribes to GET /api/events/availability with the browser's native EventSource.
 * - EventSource reconnects by itself and sends Last-Event-ID; if the server answers with an
 *   HTTP error it gives up (CLOSED), so we reopen with capped back-off.
 * - Every reconnect triggers reconciliation; the server can also request it (`resync`).
 * - Changes are announced politely and batched. Focus is never touched.
 */
export function useAvailabilityStream(): ConnectionState {
  const queryClient = useQueryClient();
  const { announce } = useAnnouncer();
  const [state, setState] = useState<ConnectionState>(() =>
    typeof EventSource === 'undefined' ? 'unsupported' : 'connecting',
  );
  const pending = useRef<AvailabilityChangedEvent[]>([]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let flushTimer: number | undefined;
    let attempts = 0;
    let hadConnection = false;
    let interrupted = false;
    let disposed = false;

    const flush = () => {
      const message = describeAvailabilityChanges(pending.current);
      pending.current = [];
      if (message) announce(message);
    };

    const connect = () => {
      source = new EventSource(apiUrl('/api/events/availability'));

      source.onopen = () => {
        attempts = 0;
        setState('live');
        if (interrupted) {
          interrupted = false;
          reconcile(queryClient);
          announce('Live availability updates have resumed.');
        }
        hadConnection = true;
      };

      source.onerror = () => {
        if (hadConnection && !interrupted) {
          interrupted = true;
          announce(
            'Live availability updates are paused while we reconnect. Your results are still shown.',
          );
        }
        setState(hadConnection ? 'reconnecting' : 'connecting');
        if (source?.readyState === EventSource.CLOSED && !disposed) {
          source.close();
          attempts += 1;
          const delay = Math.min(30_000, 1_000 * 2 ** attempts);
          retryTimer = window.setTimeout(connect, delay);
        }
      };

      source.addEventListener(SSE_EVENTS.availabilityChanged, (message: MessageEvent<string>) => {
        const event = parseAvailabilityEvent(message.data);
        if (!event) return;
        if (applyEvent(queryClient, event)) {
          pending.current.push(event);
          window.clearTimeout(flushTimer);
          flushTimer = window.setTimeout(flush, ANNOUNCE_BATCH_MS);
        }
      });

      source.addEventListener(SSE_EVENTS.availabilityResync, () => reconcile(queryClient));
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(flushTimer);
      source?.close();
    };
  }, [queryClient, announce]);

  return state;
}
