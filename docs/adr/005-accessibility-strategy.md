# 005. How accessibility is handled

- Status: accepted
- Date: 2026-11-03

## Context

The people using this app may rely on a screen reader, a keyboard, zoom or switch devices,
often while stressed. Accessibility has to be part of the design, not added at the end.

## Decision

- Use native HTML first, and ARIA only where HTML has no answer.
- Put accessible defaults into the shared `@acf/ui` components, so every screen gets them.
- Follow clear focus rules. Focus moves on page changes and after the user's own failed action.
  It never moves for background or live updates.
- Have one polite announcer for the whole app, with repeats removed and bursts grouped.
- Test at several levels: lint rules, role-based component tests, a keyboard-only journey, axe
  scans of key states, and a manual checklist.

## Consequences

- Most accessibility work happens once, in shared components and patterns.
- Tests fail when names, roles or focus break, not just when the layout breaks.
- Automated checks can't find everything, so manual testing is still needed (see
  [Accessibility.md](../Accessibility.md)).
