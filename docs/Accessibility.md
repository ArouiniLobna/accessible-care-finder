# Accessibility

**The goal is WCAG 2.2 Level AA.** The app is designed and tested toward that goal.
Automated tools can't prove full conformance on their own, so this page also lists the manual
checks and the known gaps.

## What's built in

**Structure**

- Real landmarks (`header`, `nav`, `main`, `footer`) and a **skip link** as the first thing
  on every page.
- One `<h1>` per page and a sensible heading order. The page title changes on every page.
- Native elements throughout: real buttons, links, checkboxes, radios and a native `<select>`.

**Names and wording**

- Every action has its own name. For example, "Select Amelia R.", not twelve buttons all
  called "Select". The visible words come first in the name.
- Form fields have proper labels. Hints and errors are linked to their field, and errors say
  how to fix the problem.
- Plain language throughout, and no blame in error messages.

**Focus**

- After moving to a new page, focus goes to the page heading.
- Changing filters, background updates and live updates **never move focus**.
- After a failed booking, focus moves to the message that explains it, because the customer
  is waiting for that answer.
- After "Load more", focus moves to the first new result.
- Focus is always clearly visible.

**Changing content**

- There's **one** polite announcer for the whole app. It skips repeated messages and groups
  bursts ("Availability changed for 3 support workers").
- Loading placeholders are hidden from screen readers. The area says "Loading…" once instead.

**Visual**

- Colour contrast was measured for every colour pair (see `packages/ui/src/styles/tokens.css`).
- Status is never shown by colour alone: there's always text, plus a different icon shape and,
  for unavailable cards, a dashed border.
- Click targets are at least 44 × 44 px.
- Works at 320 px wide and at 400% zoom without sideways scrolling.
- Respects "reduce motion" and Windows high-contrast (forced colours) mode.

## What's tested automatically

| Test                                    | Checks                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Component tests (React Testing Library) | Roles, names, descriptions, focus and announcements                                                           |
| axe scans (Playwright)                  | Every page **and** key states: results, filtered, empty, invalid input, error, booking conflict, confirmation |
| Keyboard journey (Playwright)           | The full flow from home to a confirmed booking with the keyboard only                                         |
| Layout tests (Playwright)               | No sideways scrolling at 320 px, reduced motion, visible focus                                                |
| ESLint `jsx-a11y`                       | Common mistakes in JSX                                                                                        |

## Manual checklist

Tick these off when you test by hand, and note the date and what you used.

- [ ] Keyboard only: complete a booking, and check focus order and that focus is visible
- [ ] Screen reader (NVDA or Narrator on Windows): headings, landmarks, card names,
      announcements
- [ ] 200% and 400% browser zoom
- [ ] Windows contrast themes / forced colours
- [ ] "Reduce motion" turned on in the operating system
- [ ] Phone-sized screen: the filters panel opens and closes, and buttons are easy to tap

## Known gaps

- Not yet tested with VoiceOver on macOS or iOS, or with TalkBack on Android.
- The demo controls table scrolls sideways on small screens. This is allowed for data tables,
  and it's a presenter tool, not a customer page.
- The app content is English only.
