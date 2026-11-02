import { createRef } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../shared/api/http';
import { renderWithProviders } from '../../../test/render';
import { BookingFailure } from './BookingFailure';

const conflict = new ApiRequestError(
  'api',
  409,
  'WORKER_NO_LONGER_AVAILABLE',
  'This worker is no longer available for that support session.',
  'req-1',
);

describe('BookingFailure', () => {
  it('explains a 409 plainly and links back to refreshed matches with filters kept', () => {
    renderWithProviders(
      <BookingFailure
        error={conflict}
        workerName="Amelia R."
        matchesHref="/replacement/support_demo_001?languages=ar"
        onRetry={vi.fn()}
        headingRef={createRef()}
      />,
    );
    expect(
      screen.getByRole('heading', {
        name: 'Problem: Amelia R. is no longer available for this session',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing has been booked/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View updated matches' })).toHaveAttribute(
      'href',
      '/replacement/support_demo_001?languages=ar',
    );
  });

  it('exposes a focusable heading for intentional focus after a failed confirm', () => {
    const ref = createRef<HTMLHeadingElement>();
    renderWithProviders(
      <BookingFailure
        error={conflict}
        workerName="Amelia R."
        matchesHref="/r"
        onRetry={vi.fn()}
        headingRef={ref}
      />,
    );
    expect(ref.current).toHaveAttribute('tabindex', '-1');
  });

  it('reassures that retrying an unknown failure is safe', () => {
    renderWithProviders(
      <BookingFailure
        error={new ApiRequestError('network', 0, 'NETWORK_ERROR', 'offline')}
        workerName="Amelia R."
        matchesHref="/r"
        onRetry={vi.fn()}
        headingRef={createRef()}
      />,
    );
    expect(screen.getByText(/won.t be booked twice/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
