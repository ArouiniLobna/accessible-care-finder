import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { AnnouncerProvider } from '../shared/accessibility/announcer';
import { createQueryClient } from '../shared/api/query-client';
import { router } from './router';

/**
 * State ownership:
 *  - server state → TanStack Query (this provider);
 *  - meaningful search state → the URL (React Router);
 *  - transient UI state → component state.
 * No global client store is needed.
 */
export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </QueryClientProvider>
  );
}
