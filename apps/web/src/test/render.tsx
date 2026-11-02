import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AnnouncerProvider, AnnouncerRegion } from '../shared/accessibility/announcer';

/** Render inside the same providers the app uses, with a fresh cache per test. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [route] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
        <AnnouncerRegion />
      </AnnouncerProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient, router };
}

/** The app-wide polite live region. */
export const announcer = () => document.getElementById('app-announcer');
