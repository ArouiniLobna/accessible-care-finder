# 004. Cursor pagination instead of OFFSET

## Context

Search results change while people page through them, because workers get booked. With
`LIMIT 12 OFFSET 24`, rows can be skipped or repeated, and deep pages get slower.

## Decision

Use keyset (cursor) pagination. The cursor holds the last row's sort values and its ID. Every
sort ends with the ID as a tie-breaker, so the order is always the same.

## Consequences

- No skipped or repeated workers, even while availability changes.
- The cursor is opaque to the browser. The API checks it carefully and rejects anything odd
  with `INVALID_CURSOR`.
- Users can't jump straight to "page 7". The UI uses an explicit "Load more" button, which is
  also the more accessible pattern.
- **Revisit when** numbered pages become a real need.
