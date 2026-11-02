import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WorkerSummary } from '@acf/contracts';
import { renderWithProviders } from '../../../test/render';
import { WorkerCard } from './WorkerCard';

const amelia: WorkerSummary = {
  id: 'worker_017',
  firstName: 'Amelia',
  lastInitial: 'R',
  verified: true,
  rating: 4.9,
  reviewCount: 42,
  hourlyRateCents: 5800,
  distanceKm: 2.4,
  services: [
    { id: 'personal-care', name: 'Personal care' },
    { id: 'meal-preparation', name: 'Meal preparation' },
  ],
  languages: [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic' },
  ],
  hasTransport: true,
  availability: { slotId: 'availability_017', status: 'AVAILABLE', version: 41 },
};

describe('WorkerCard', () => {
  it('is an article named by the worker, with distinguishable action names', () => {
    renderWithProviders(
      <WorkerCard worker={amelia} profileHref="/workers/worker_017" selectHref="/review" />,
    );
    const card = screen.getByRole('article', { name: 'Amelia R.' });
    expect(within(card).getByRole('heading', { level: 3, name: 'Amelia R.' })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: "View Amelia R.'s profile" })).toHaveAttribute(
      'href',
      '/workers/worker_017',
    );
    expect(within(card).getByRole('link', { name: 'Select Amelia R.' })).toBeInTheDocument();
  });

  it('shows the decision-making facts as text', () => {
    renderWithProviders(<WorkerCard worker={amelia} profileHref="/p" selectHref="/s" />);
    expect(screen.getByText('4.9 out of 5 from 42 reviews')).toBeInTheDocument();
    expect(screen.getByText('2.4 km away')).toBeInTheDocument();
    expect(screen.getByText('$58.00 per hour')).toBeInTheDocument();
    expect(screen.getByText('English and Arabic')).toBeInTheDocument();
    expect(screen.getByText('Available for your session')).toBeInTheDocument();
  });

  it('hides decorative initials from assistive technology', () => {
    renderWithProviders(<WorkerCard worker={amelia} profileHref="/p" selectHref="/s" />);
    expect(screen.getByText('AR')).toHaveAttribute('aria-hidden', 'true');
  });

  it('states unavailability in text and removes the select action', () => {
    renderWithProviders(
      <WorkerCard
        worker={{
          ...amelia,
          availability: { ...amelia.availability, status: 'BOOKED', version: 42 },
        }}
        profileHref="/p"
        selectHref="/s"
      />,
    );
    expect(screen.getByText('No longer available')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Select Amelia R.' })).toBeNull();
    expect(screen.getByText(/Can't be selected for this session/)).toBeInTheDocument();
  });
});
