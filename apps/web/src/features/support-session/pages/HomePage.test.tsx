import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportRequest } from '@acf/contracts';
import { renderWithProviders } from '../../../test/render';
import HomePage from './HomePage';

const cancelledSession = {
  id: 'support_demo_001',
  status: 'CANCELLED_NEEDS_REPLACEMENT',
  timezone: 'Australia/Sydney',
  startsAt: '2026-11-06T23:00:00.000Z',
  endsAt: '2026-11-07T02:00:00.000Z',
  location: { suburb: 'Parramatta', postcode: '2150' },
  services: [{ id: 'personal-care', name: 'Personal care' }],
  replacementBookingId: null,
} satisfies SupportRequest;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('HomePage', () => {
  it('shows the cancelled session and a way to find a replacement', async () => {
    fetchMock.mockImplementation(async () => json(200, cancelledSession));
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Upcoming support' })).toBeInTheDocument();
    expect(screen.getByText('Loading your upcoming support…')).toBeInTheDocument();

    const link = await screen.findByRole('link', { name: 'Find a replacement' });
    expect(link).toHaveAttribute('href', '/replacement/support_demo_001');
    expect(
      screen.getByRole('heading', { name: /Warning: .*no longer available/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Parramatta 2150')).toBeInTheDocument();
  });

  it('offers Try again after a failure, and recovers', async () => {
    fetchMock.mockImplementation(async () =>
      json(500, {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side.',
        requestId: 'req-1',
      }),
    );
    renderWithProviders(<HomePage />);

    expect(
      await screen.findByRole('heading', { name: /Problem: We couldn't load/ }),
    ).toBeInTheDocument();

    fetchMock.mockImplementation(async () => json(200, cancelledSession));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Find a replacement' })).toBeInTheDocument();
  });
});
