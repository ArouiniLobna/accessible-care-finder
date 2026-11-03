# 007. PostgreSQL with Drizzle

## Context

The data is relational: workers, slots, services, sessions and bookings. Correctness matters
most around booking.

## Decision

Use PostgreSQL. Use Drizzle for the schema, migrations and simple typed queries, and plain SQL
(still with bound parameters) where SQL is clearer, such as search.

## Consequences

- The database protects the data too: check constraints, foreign keys, a rule that stops a
  worker's slots from overlapping, and unique indexes for confirmed bookings.
- Transactions and row locks make booking safe.
- Migrations are committed SQL files, reviewed like code.
- Raw SQL results are checked at runtime before use, so a schema change fails loudly instead
  of sending bad data to the browser.
- **Revisit when** search grows beyond what one SQL query can serve. Then consider PostGIS or a
  search engine.
