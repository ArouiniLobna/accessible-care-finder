import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PageHeading, RouteFocusBoundary } from './page-heading';

function setup() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <RouteFocusBoundary>
            <Outlet />
          </RouteFocusBoundary>
        ),
        children: [
          { path: '/', element: <PageHeading>Upcoming support</PageHeading> },
          {
            path: '/components',
            element: (
              <>
                <PageHeading>Component catalogue</PageHeading>
                <button type="button">Filter</button>
              </>
            ),
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('PageHeading', () => {
  it('sets the document title from the heading', () => {
    setup();
    expect(document.title).toBe('Upcoming support · Accessible Care Finder');
  });

  it('does not steal focus on the first page load', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('moves focus to the new page heading after a navigation', async () => {
    const router = setup();
    await act(() => router.navigate('/components'));
    expect(screen.getByRole('heading', { level: 1, name: 'Component catalogue' })).toHaveFocus();
    expect(document.title).toBe('Component catalogue · Accessible Care Finder');
  });

  it('does not move focus when only the query string changes', async () => {
    const router = setup();
    await act(() => router.navigate('/components'));
    const filter = screen.getByRole('button', { name: 'Filter' });
    filter.focus();
    await act(() => router.navigate('/components?radius=20'));
    expect(filter).toHaveFocus();
  });
});
