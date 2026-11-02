import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { parseFilters, serializeFilters, type SearchFilters } from '../model/search-criteria';

/**
 * Filters live in the URL: shareable, restored by Back, and still there after a failed
 * booking sends the customer back to their matches. Updates replace the history entry so
 * each checkbox doesn't add a Back step.
 *
 * The UI reads a local copy that updates synchronously. React Router applies URL changes in a
 * transition, so binding controlled checkboxes straight to the URL made a ticked box spring
 * back to unticked until the navigation landed — a visible flicker, and a wrong
 * "not checked" state for screen readers right after pressing Space.
 * Whenever the URL itself moves (our write landing, Back/Forward, a link), the URL wins.
 */
export function useSearchFilters() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.toString();
  const [state, setState] = useState(() => ({
    seenQuery: urlQuery,
    filters: parseFilters(params),
  }));

  let filters = state.filters;
  if (state.seenQuery !== urlQuery) {
    // "Adjusting state while rendering": adopt the URL whenever it changes.
    filters = parseFilters(params);
    setState({ seenQuery: urlQuery, filters });
  }

  const setFilters = (next: SearchFilters) => {
    setState((current) => ({ ...current, filters: next }));
    setParams(serializeFilters(next), { replace: true, preventScrollReset: true });
  };

  return { filters, setFilters, queryString: serializeFilters(filters).toString() };
}

/** Append the current filter query string (if any) to a path. */
export const withQuery = (path: string, queryString: string) =>
  queryString ? `${path}?${queryString}` : path;
