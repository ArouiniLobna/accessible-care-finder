# 006. One API service, split into modules

## Context

The domain is small: search, profiles, booking and live updates. Booking needs a transaction
across several tables.

## Decision

Build one Fastify app with clear modules (route → service → repository), wired together in
`app.ts` with plain functions.

## Consequences

- One thing to run, test and deploy. Transactions across tables are simple.
- The module boundaries make a later split possible without a rewrite.
- **Revisit when** separate teams own separate parts, or one part needs to scale on its own.
