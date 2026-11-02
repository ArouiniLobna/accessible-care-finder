import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { AnnouncerProvider } from '../../shared/accessibility/announcer';
import { PageHeading } from '../../shared/accessibility/page-heading';
import { AppLayout } from './AppLayout';

function setup() {
  const router = createMemoryRouter([
    {
      element: <AppLayout />,
      children: [{ path: '/', element: <PageHeading>Upcoming support</PageHeading> }],
    },
  ]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </QueryClientProvider>,
  );
}

describe('AppLayout', () => {
  it('makes the skip link the first thing keyboard users reach', async () => {
    setup();
    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('exposes the landmarks screen-reader users navigate by', () => {
    setup();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      /independent portfolio project using fictional data\. It is not affiliated with, endorsed by, or connected to any organization/,
    );
  });

  it('marks the current page in the navigation', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Your support' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Components' })).not.toHaveAttribute('aria-current');
  });
});
