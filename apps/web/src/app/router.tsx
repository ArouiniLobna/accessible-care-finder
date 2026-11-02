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
const WorkerProfilePage = lazy(() => import('../features/worker-profile/pages/WorkerProfilePage'));
const DemoControlsPage = lazy(() => import('../features/demo-controls/pages/DemoControlsPage'));
const ReviewReplacementPage = lazy(
  () => import('../features/replacement-booking/pages/ReviewReplacementPage'),
);
const ConfirmationPage = lazy(
  () => import('../features/replacement-booking/pages/ConfirmationPage'),
);

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/replacement/:supportRequestId', element: <ReplacementSearchPage /> },
      { path: '/workers/:workerId', element: <WorkerProfilePage /> },
      { path: '/components', element: <ComponentsPage /> },
      { path: '/demo-controls', element: <DemoControlsPage /> },
      {
        path: '/replacement/:supportRequestId/review/:workerId',
        element: <ReviewReplacementPage />,
      },
      { path: '/bookings/:bookingId/confirmation', element: <ConfirmationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
