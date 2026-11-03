# 002. TanStack Query for server data

## Context

Most of the app's state is data from the server. It needs caching, loading and error states,
cancelling old searches, paging, and being updated by live events.

## Decision

Use TanStack Query for all server data. Search filters live in the URL, and small UI details
live in component state. There's no global store.

## Consequences

- Cancelling, retrying, paging ("Load more") and keeping old results visible during a refresh
  all come built in.
- Live events can update cached results in place with `setQueryData`.
- Every cache key is built in one file (`query-keys.ts`), so whole groups can be updated or
  refreshed safely.
- **Revisit when** there's a lot of shared, client-only state. There isn't today.
