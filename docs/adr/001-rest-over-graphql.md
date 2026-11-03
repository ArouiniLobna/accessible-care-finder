# 001. REST instead of GraphQL

## Context

The app has a few simple resources: support requests, workers, bookings and reference data.
The screens are known up front.

## Decision

Use a small REST API. Each route has a TypeBox schema for validation and types, and the
OpenAPI docs are generated from the same schemas.

## Consequences

- Simple to build, test and cache. For example, services and languages are cached for 5
  minutes with a plain `Cache-Control` header.
- The docs can't drift from the code, because they come from the same schemas.
- Clients can't ask for custom shapes. That's fine with one client and a handful of screens.
- **Revisit when** several different clients need very different data from the same API.
