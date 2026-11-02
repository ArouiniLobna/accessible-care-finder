import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { LoadingIndicator } from '@acf/ui';
import { AnnouncerRegion } from '../../shared/accessibility/announcer';
import { RouteFocusBoundary } from '../../shared/accessibility/page-heading';
import { LiveConnectionStatus } from '../../features/live-availability/components/LiveConnectionStatus';
import { useAvailabilityStream } from '../../features/live-availability/hooks/useAvailabilityStream';
import { config } from '../../shared/config';
import styles from './AppLayout.module.css';

/**
 * Page chrome shared by every route: skip link, header, primary navigation, <main>, footer.
 * The availability stream is opened here so one tab holds exactly one EventSource.
 */
export function AppLayout() {
  const connection = useAvailabilityStream();
  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" className={styles.logo}>
              <rect width="32" height="32" rx="7" fill="currentColor" />
              <path
                d="M16 24s-7-4.4-7-9.3A3.9 3.9 0 0 1 16 12a3.9 3.9 0 0 1 7 2.7C23 19.6 16 24 16 24Z"
                fill="var(--color-surface)"
              />
            </svg>
            {config.appName}
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            <ul>
              <li>
                <NavLink to="/" end>
                  Your support
                </NavLink>
              </li>
              <li>
                <NavLink to="/components">Components</NavLink>
              </li>
              {config.demoControlsEnabled ? (
                <li>
                  <NavLink to="/demo-controls">Demo controls</NavLink>
                </li>
              ) : null}
            </ul>
          </nav>
          <LiveConnectionStatus state={connection} />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Suspense
          fallback={
            <p className={styles.routeLoading}>
              <LoadingIndicator label="Loading page…" />
            </p>
          }
        >
          <RouteFocusBoundary>
            <Outlet />
          </RouteFocusBoundary>
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <p>
          Accessible Care Finder is an independent portfolio project using fictional data. It is not
          affiliated with, endorsed by, or connected to any organization.
        </p>
        <AnnouncerRegion />
      </footer>
    </div>
  );
}
