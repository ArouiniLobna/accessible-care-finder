# Testing

The aim is to test what a person actually experiences, and to use the real database and a
real browser where it matters.

| Level                        | Tools                                | Command                 | Needs            |
| ---------------------------- | ------------------------------------ | ----------------------- | ---------------- |
| Unit                         | Vitest                               | `pnpm test`             | Nothing          |
| Component                    | Vitest, React Testing Library        | `pnpm test`             | Nothing          |
| API integration              | Vitest, Fastify `inject`, PostgreSQL | `pnpm test:integration` | Docker           |
| End-to-end and accessibility | Playwright, axe                      | `pnpm test:e2e`         | Docker, Chromium |

## What each level covers

**Unit tests** cover the tricky logic: search cursors, including made-up or hostile ones;
time zones on daylight-saving days; money; the seed data rules; config checks; the live-event
hub (replay and resync); URL filters; and live cache updates.

**Component tests** find elements by role and name (for example,
`getByRole('link', { name: 'Select Amelia R.' })`), like a screen reader would. They cover:

- the UI building blocks;
- worker cards;
- the results list (announcements, "Load more" and focus, empty and error states);
- the filters;
- the booking error messages;
- focus after moving to a new page.

**API integration tests** run the real API against a real PostgreSQL test database. It's
rebuilt from the migrations on every run. The tests cover search and paging for every sort
order, filters, the error format, booking, idempotency, live updates, and the demo routes
being hidden when switched off.

**End-to-end tests** run the real API and a production build of the web app in Chromium:

- a keyboard-only journey from home to a confirmed booking;
- the booking conflict, with the filters kept;
- a live update from a second browser;
- axe scans of every page and key state;
- layout checks at 320 px, reduced motion and visible focus.

## The race condition test

The most important API test sends **two bookings for the same worker at the same moment**. It
checks that exactly one gets `201` and the other gets `409`. A second test sends the same
idempotency key twice at once, and checks that you get one booking, not two.

## Do the tests really protect anything?

A few quick checks, each made by breaking one line on purpose:

| Break this                                       | And this fails                                     |
| ------------------------------------------------ | -------------------------------------------------- |
| Remove the version check in the booking `UPDATE` | The "stale version gets 409" integration test      |
| Remove the `id` tie-breaker from a sort          | The "no duplicates while paging" integration test  |
| Remove `z-index` from the checkbox styles        | The axe/filters end-to-end test, at `.check()`     |
| Let filter changes move focus                    | The keyboard journey, at "Arabic is still focused" |
| Lower the secondary text contrast                | The axe scans (`color-contrast`)                   |

## Tips

- Integration tests only run against a database whose name contains "test", so they can never
  wipe your development data.
- Stop `pnpm dev` before `pnpm test:e2e`, so Playwright starts the servers with its own
  settings.
- `pnpm exec playwright test --ui` shows each test step by step.
