import { useInfiniteQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SearchWorkersResponse, WorkerSummary } from '@acf/contracts';
import { announcer, renderWithProviders } from '../../../test/render';
import { resultsMessage, SearchResults } from './SearchResults';

const worker = (n: number): WorkerSummary => ({
  id: `worker_${n}`,
  firstName: `Person${n}`,
  lastInitial: 'Z',
  verified: false,
  rating: 4.5,
  reviewCount: 3,
  hourlyRateCents: 6000,
  distanceKm: n,
  services: [],
  languages: [{ code: 'en', name: 'English' }],
  hasTransport: false,
  availability: { slotId: `slot_${n}`, status: 'AVAILABLE', version: 1 },
});

const response = (
  items: WorkerSummary[],
  total: number,
  nextCursor: string | null,
): SearchWorkersResponse => ({
  items,
  nextCursor,
  meta: { resultCount: total, generatedAt: '2026-11-01T00:00:00.000Z' },
});

function Harness({
  fetchPage,
  onWidenRadius = () => undefined,
}: {
  fetchPage: (cursor: string | null) => Promise<SearchWorkersResponse>;
  onWidenRadius?: () => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ['test-search'],
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  return (
    <SearchResults
      query={query}
      sort="recommended"
      onSortChange={() => undefined}
      widerRadius={20}
      onWidenRadius={onWidenRadius}
      canClearOptional
      onClearOptional={() => undefined}
      profileHref={(id) => `/workers/${id}`}
      selectHref={(id) => `/review/${id}`}
    />
  );
}

describe('resultsMessage', () => {
  it('reads naturally for each outcome', () => {
    expect(resultsMessage(0, 0)).toBe('No matching support workers found.');
    expect(resultsMessage(1, 1)).toBe('1 matching support worker shown.');
    expect(resultsMessage(12, 23)).toBe('12 of 23 matching support workers shown.');
  });
});

describe('SearchResults', () => {
  it('announces the settled result count once', async () => {
    renderWithProviders(
      <Harness fetchPage={async () => response([worker(1), worker(2)], 2, null)} />,
    );
    await waitFor(() => expect(announcer()).toHaveTextContent('2 matching support workers shown.'));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('loads more with an explicit button, announces it and focuses the first new result', async () => {
    const fetchPage = vi.fn(async (cursor: string | null) =>
      cursor === null
        ? response([worker(1), worker(2)], 3, 'next')
        : response([worker(3)], 3, null),
    );
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    const button = await screen.findByRole('button', { name: 'Load more matching workers' });
    await userEvent.click(button);
    await waitFor(() =>
      expect(announcer()).toHaveTextContent('1 more support worker loaded. 3 shown.'),
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Person3 Z.' })).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Load more matching workers' })).toBeNull();
  });

  it('offers working recovery actions when nothing matches', async () => {
    const onWidenRadius = vi.fn();
    renderWithProviders(
      <Harness fetchPage={async () => response([], 0, null)} onWidenRadius={onWidenRadius} />,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'No workers currently match all of these preferences',
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Increase search radius to 20 km' }));
    expect(onWidenRadius).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Clear optional filters' })).toBeInTheDocument();
  });

  it('explains failures without technical jargon and offers a retry', async () => {
    renderWithProviders(
      <Harness fetchPage={async () => Promise.reject(new Error('ECONNREFUSED'))} />,
    );
    expect(
      await screen.findByRole('heading', { name: /We couldn't update your matches/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
  });

  it('hides loading skeletons from assistive technology', async () => {
    renderWithProviders(<Harness fetchPage={() => new Promise(() => undefined)} />);
    expect(await screen.findByText('Loading matching support workers…')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(document.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
  });
});
