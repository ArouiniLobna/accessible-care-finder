import AxeBuilder from '@axe-core/playwright';
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export const SEARCH_URL = '/replacement/support_demo_001';

/** Restore the seeded scenario through the demo API (reachable via the preview proxy). */
export async function resetScenario(request: APIRequestContext) {
  const response = await request.post('/api/demo/reset');
  expect(response.status()).toBe(204);
}

/**
 * Press Tab until `target` has focus. Fails if it is not reached within `max` presses —
 * which would mean it is not keyboard reachable in a sensible order.
 */
export async function tabTo(page: Page, target: Locator, max = 80) {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach ${target.toString()} with ${max} Tab presses`);
}

/**
 * axe-core against WCAG 2.0/2.1/2.2 A & AA rules, after dynamic content has rendered.
 * A clean result is necessary, not sufficient: see docs/accessibility.md for manual checks.
 */
export async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.nodes.length} node(s) — ${v.help}`,
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

export const announcer = (page: Page) => page.locator('#app-announcer');

export const workerCard = (page: Page, name: string) => page.getByRole('article', { name });
