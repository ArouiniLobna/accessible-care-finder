import { useEffect, useRef } from 'react';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { SearchRadiusKm, SearchSort, SearchWorkersResponse } from '@acf/contracts';
import { Alert, Button, EmptyState, Field, LoadingIndicator, Select, Skeleton } from '@acf/ui';
import { useAnnouncer } from '../../../shared/accessibility/announcer';
import { WorkerCard } from './WorkerCard';
import styles from './SearchResults.module.css';

type SearchQuery = UseInfiniteQueryResult<InfiniteData<SearchWorkersResponse>>;

const SORT_LABELS: Record<SearchSort, string> = {
  recommended: 'Recommended',
  closest: 'Closest',
  highest_rated: 'Highest rated',
  lowest_rate: 'Lowest hourly rate',
};

interface SearchResultsProps {
  query: SearchQuery;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  /** Next radius for the empty state, or null when already widest. */
  widerRadius: SearchRadiusKm | null;
  onWidenRadius: () => void;
  canClearOptional: boolean;
  onClearOptional: () => void;
  profileHref: (workerId: string) => string;
  selectHref: (workerId: string) => string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function resultsMessage(shown: number, total: number): string {
  if (total === 0) return 'No matching support workers found.';
  if (shown < total) return `${shown} of ${total} matching support workers shown.`;
  return `${total} matching support ${plural(total, 'worker', 'workers')} shown.`;
}

/**
 * Results with distinct states: first load, refreshing (old results stay, marked busy),
 * empty (with working recovery actions), error, and loaded.
 *
 * Announcements are restrained: one polite message when results settle *and the message
 * changed*, a specific one for "Load more", none for background refetches with the same
 * outcome, and none per keystroke.
 */
export function SearchResults({
  query,
  sort,
  onSortChange,
  widerRadius,
  onWidenRadius,
  canClearOptional,
  onClearOptional,
  profileHref,
  selectHref,
}: SearchResultsProps) {
  const { announce } = useAnnouncer();
  const lastAnnounced = useRef('');
  /** Worker whose card should receive focus once it has rendered (after "Load more"). */
  const focusWorkerId = useRef<string | null>(null);

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages.at(-1)?.meta.resultCount ?? 0;
  const isInitialLoad = query.isPending && query.fetchStatus !== 'idle';
  const isRefreshing = query.isFetching && !query.isFetchingNextPage && !isInitialLoad;

  // Announce the settled outcome, once per distinct message.
  const settledMessage =
    query.isSuccess && !query.isFetching && !query.isPlaceholderData
      ? resultsMessage(items.length, total)
      : null;
  useEffect(() => {
    if (isInitialLoad && lastAnnounced.current === '') {
      lastAnnounced.current = 'loading';
      announce('Loading matching support workers…');
    }
  }, [isInitialLoad, announce]);
  useEffect(() => {
    if (settledMessage && settledMessage !== lastAnnounced.current) {
      lastAnnounced.current = settledMessage;
      announce(settledMessage);
    }
  }, [settledMessage, announce]);
  useEffect(() => {
    if (query.isError && !query.isFetching) announce("We couldn't update your matches.");
  }, [query.isError, query.isFetching, announce]);

  // After "Load more", move focus to the first new result so keyboard users continue there
  // (the button they pressed may disappear when the last page arrives).
  useEffect(() => {
    const id = focusWorkerId.current;
    if (!id) return;
    const heading = document.getElementById(`worker-${id}-name`);
    if (heading) {
      heading.focus();
      focusWorkerId.current = null;
    }
  }, [items.length]);

  const loadMore = async () => {
    const before = items.length;
    const result = await query.fetchNextPage();
    if (result.isError) {
      announce("We couldn't load more matches. Please try again.");
      return;
    }
    const all = result.data?.pages.flatMap((page) => page.items) ?? [];
    const after = all.length;
    const added = after - before;
    focusWorkerId.current = all[before]?.id ?? null;
    const message = `${added} more support ${plural(added, 'worker', 'workers')} loaded. ${after} shown.`;
    lastAnnounced.current = resultsMessage(after, total);
    announce(message);
  };

  return (
    <section aria-labelledby="results-heading" className={styles.results}>
      <div className={styles.toolbar}>
        <div>
          <h2 id="results-heading" className={styles.heading}>
            Matching support workers
          </h2>
          {/* Visible status. Speech is handled by the app announcer, so this is not a live region. */}
          <p className={styles.status}>
            {isInitialLoad ? (
              <LoadingIndicator label="Loading matching support workers…" />
            ) : isRefreshing ? (
              <LoadingIndicator label="Updating matches…" />
            ) : query.isSuccess ? (
              resultsMessage(items.length, total)
            ) : null}
          </p>
        </div>
        <div className={styles.sort}>
          <Field label="Sort by">
            {(control) => (
              <Select
                {...control}
                value={sort}
                onChange={(event) => onSortChange(event.currentTarget.value as SearchSort)}
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>

      {query.isError ? (
        <Alert
          tone="danger"
          headingLevel={3}
          title="We couldn't update your matches"
          actions={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        >
          <p>
            {items.length > 0
              ? 'Your current results are still shown. Try again when you’re ready.'
              : 'Please try again when you’re ready. Your filters have been kept.'}
          </p>
        </Alert>
      ) : null}

      {isInitialLoad ? (
        <ul className={styles.grid} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonCard}>
              <Skeleton height="1.5rem" width="50%" />
              <Skeleton height="1rem" width="70%" />
              <Skeleton height="1rem" />
              <Skeleton height="1rem" width="80%" />
              <Skeleton height="2.75rem" width="60%" />
            </li>
          ))}
        </ul>
      ) : query.isSuccess && items.length === 0 ? (
        <EmptyState
          headingLevel={3}
          title="No workers currently match all of these preferences"
          actions={
            <>
              {widerRadius !== null ? (
                <Button variant="primary" onClick={onWidenRadius}>
                  Increase search radius to {widerRadius} km
                </Button>
              ) : null}
              {canClearOptional ? (
                <Button variant="secondary" onClick={onClearOptional}>
                  Clear optional filters
                </Button>
              ) : null}
            </>
          }
        >
          <p>Try increasing the search radius or removing an optional filter.</p>
        </EmptyState>
      ) : items.length > 0 ? (
        <ul className={styles.grid} aria-busy={isRefreshing || undefined}>
          {items.map((worker) => (
            <li key={worker.id}>
              <WorkerCard
                worker={worker}
                profileHref={profileHref(worker.id)}
                selectHref={selectHref(worker.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {query.hasNextPage ? (
        <div className={styles.more}>
          <Button
            variant="secondary"
            busy={query.isFetchingNextPage}
            busyLabel="Loading more matching workers…"
            onClick={() => void loadMore()}
          >
            Load more matching workers
          </Button>
        </div>
      ) : null}
    </section>
  );
}
