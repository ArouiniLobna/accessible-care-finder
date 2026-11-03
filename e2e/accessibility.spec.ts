import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, resetScenario, SEARCH_URL, workerCard } from './support';

test.beforeEach(async ({ request }) => resetScenario(request));

test.describe('automated accessibility scans (axe, WCAG 2.2 A/AA tags)', () => {
  test('home / cancelled session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Find a replacement' })).toBeVisible();
    await expectNoAxeViolations(page, 'home');
  });

  test('search: results, filtered, empty and error states', async ({ page, request }) => {
    await page.goto(SEARCH_URL);
    await expect(workerCard(page, 'Amelia R.')).toBeVisible();
    await expectNoAxeViolations(page, 'search results');

    await page.getByRole('checkbox', { name: 'Has their own transport' }).check();
    await expect(page).toHaveURL(/transport=true/);
    await expect(page.getByText('Updating matches…')).toHaveCount(0);
    await expectNoAxeViolations(page, 'filtered search');

    await page.getByRole('textbox', { name: /Maximum hourly rate/ }).fill('30');
    await expect(
      page.getByRole('heading', { name: 'No workers currently match all of these preferences' }),
    ).toBeVisible();
    await expectNoAxeViolations(page, 'empty search');

    await page.getByRole('textbox', { name: /Maximum hourly rate/ }).fill('12.5');
    await expect(page.getByText(/Error:/)).toBeVisible();
    await expectNoAxeViolations(page, 'invalid filter input');

    // Turn on simulated failures, then ask for a search that isn't already cached.
    // (Clearing filters would return to the first search, which is still fresh in the cache
    // for 30 s and correctly shown without a request.) Two retries happen first, ~3 s.
    await request.put('/api/demo/faults', { data: { searchFailure: true } });
    await page.getByRole('button', { name: 'Increase search radius to 20 km' }).click();
    await expect(
      page.getByRole('heading', { name: /We couldn't update your matches/ }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expectNoAxeViolations(page, 'search error');
  });

  test('worker profile', async ({ page }) => {
    await page.goto('/workers/worker_017?supportRequestId=support_demo_001');
    await expect(page.getByRole('heading', { level: 1, name: 'Amelia R.' })).toBeVisible();
    await expectNoAxeViolations(page, 'profile');
  });

  test('review, conflict and confirmation', async ({ page, request }) => {
    await page.goto(`${SEARCH_URL}/review/worker_017`);
    await expect(page.getByRole('button', { name: 'Confirm replacement' })).toBeVisible();
    await expectNoAxeViolations(page, 'review');

    await request.post('/api/demo/availability/availability_017', {
      data: { status: 'AVAILABLE', broadcast: false },
    });
    await page.getByRole('button', { name: 'Confirm replacement' }).click();
    await expect(page.getByRole('link', { name: 'View updated matches' })).toBeVisible();
    await expectNoAxeViolations(page, 'booking conflict');

    await page.goto(`${SEARCH_URL}/review/worker_009`);
    await page.getByRole('button', { name: 'Confirm replacement' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Replacement support confirmed' }),
    ).toBeVisible();
    await expectNoAxeViolations(page, 'confirmation');
  });

  test('component catalogue, demo controls and not found', async ({ page }) => {
    await page.goto('/components');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Component catalogue' }),
    ).toBeVisible();
    await expectNoAxeViolations(page, 'components');

    await page.goto('/demo-controls');
    await expect(page.getByRole('button', { name: 'Make unavailable: Amelia R.' })).toBeVisible();
    await expectNoAxeViolations(page, 'demo controls');

    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expectNoAxeViolations(page, 'not found');
  });
});

test.describe('layout resilience', () => {
  test('reflows at 320 CSS px without horizontal page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of ['/', SEARCH_URL, `${SEARCH_URL}/review/worker_017`, '/components']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test('narrow screens use an accessible filters disclosure', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(SEARCH_URL);
    const toggle = page.getByRole('button', { name: /Show filters/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: /Hide filters/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByRole('group', { name: 'Search radius' })).toBeVisible();
  });

  test('respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/components');
    await expect(page.getByText('Loading matching support workers…').first()).toBeVisible();
    const longestAnimationSeconds = await page.evaluate(() =>
      Math.max(
        0,
        ...Array.from(document.querySelectorAll('*'))
          .map((element) => getComputedStyle(element))
          .filter((style) => style.animationName !== 'none')
          .map((style) => parseFloat(style.animationDuration)),
      ),
    );
    expect(longestAnimationSeconds).toBeLessThan(0.1);
  });

  test('keeps focus visible on interactive controls', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const element = document.activeElement;
      return element ? getComputedStyle(element).outlineStyle : 'none';
    });
    expect(outline).not.toBe('none');
  });
});
