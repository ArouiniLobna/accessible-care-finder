import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import { config } from '../config';

/**
 * SPA route accessibility.
 *
 * A client-side navigation does not reset focus or announce a new page the way a full page
 * load does. So each page renders exactly one <PageHeading>, which:
 *   1. sets document.title ("Page · Accessible Care Finder");
 *   2. after a *navigation* (not the initial load), moves focus to the <h1> (tabIndex -1),
 *      so screen readers announce the new page and keyboard users continue from the top.
 *
 * Focus moves only when the *pathname* changes. Filter changes (query-string updates), data
 * refetches, SSE updates and re-renders never move focus.
 */

/** true once the user has navigated away from the page the app was first loaded on. */
const HasNavigatedContext = createContext(false);

/** Render inside the router (it reads the location), around all routed pages. */
export function RouteFocusBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [initialPath] = useState(pathname);
  const [hasNavigated, setHasNavigated] = useState(false);
  // "Adjusting state while rendering": React re-renders immediately, before children see it.
  if (!hasNavigated && pathname !== initialPath) setHasNavigated(true);
  return (
    <HasNavigatedContext.Provider value={hasNavigated}>{children}</HasNavigatedContext.Provider>
  );
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${config.appName}`;
  }, [title]);
}

interface PageHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Document title; defaults to the heading text when that is a string. */
  documentTitle?: string;
  children: ReactNode;
}

export function PageHeading({ documentTitle, children, ...rest }: PageHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();
  const hasNavigated = useContext(HasNavigatedContext);
  useDocumentTitle(documentTitle ?? (typeof children === 'string' ? children : config.appName));

  useEffect(() => {
    if (hasNavigated) ref.current?.focus();
  }, [pathname, hasNavigated]);

  return (
    <h1 ref={ref} tabIndex={-1} {...rest}>
      {children}
    </h1>
  );
}
