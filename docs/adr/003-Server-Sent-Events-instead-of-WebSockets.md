# 003. Server-Sent Events instead of WebSockets

## Context

Browsers need to hear about availability changes quickly. Data only flows one way, from the
server to the browser.

## Decision

Use Server-Sent Events, with the browser's built-in `EventSource`.

## Consequences

- It's plain HTTP: it works through normal proxies and needs no extra library.
- The browser reconnects by itself and sends `Last-Event-ID`, so the server can resend missed
  events, or ask the browser to refetch.
- Events are only hints. Every booking is still checked in the database.
- The event hub lives in memory, so it works on **one** API server.
- **Revisit when** the app needs two-way messages, or when there's more than one API server.
  In that case, add a shared channel such as Postgres `LISTEN/NOTIFY` or Redis.
