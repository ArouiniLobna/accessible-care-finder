import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import HomePage from '../features/support-session/pages/HomePage';
import { AppLayout } from './layout/AppLayout';
import NotFoundPage from './NotFoundPage';

// The landing page ships in the main bundle; every other page loads on demand.
const ComponentsPage = lazy(() => import('../features/component-catalogue/pages/ComponentsPage'));
const ReplacementSearchPage = lazy(
  () => import('../features/replacement-search/pages/ReplacementSearchPage'),
);

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/replacement/:supportRequestId', element: <ReplacementSearchPage /> },
      { path: '/components', element: <ComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
