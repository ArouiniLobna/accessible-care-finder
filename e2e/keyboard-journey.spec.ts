import { expect, test } from '@playwright/test';
import { announcer, resetScenario, tabTo, workerCard } from './support';

test.beforeEach(async ({ request }) => resetScenario(request));

test('a keyboard-only customer can find, review and confirm a replacement', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Upcoming support · Accessible Care Finder');

  // The skip link is the first stop and becomes visible on focus.
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  // Cancelled session → Find a replacement.
  await expect(
    page.getByText('Your regular support worker is no longer available for this session'),
  ).toBeVisible();
  await tabTo(page, page.getByRole('link', { name: 'Find a replacement' }));
  await page.keyboard.press('Enter');

  // Route change moves focus to the new page's heading.
  const searchHeading = page.getByRole('heading', { level: 1, name: 'Find a replacement' });
  await expect(searchHeading).toBeFocused();
  await expect(page).toHaveTitle('Find a replacement · Accessible Care Finder');
  await expect(announcer(page)).toContainText('matching support workers shown');

  // Session details are inherited, not re-entered.
  await expect(page.getByRole('region', { name: 'Your support session' })).toContainText(
    'Parramatta 2150',
  );

  // Refine with the keyboard: Space toggles the native checkbox.
  const arabic = page.getByRole('checkbox', { name: 'Arabic' });
  await tabTo(page, arabic);
  await page.keyboard.press('Space');
  await expect(arabic).toBeChecked();
  await expect(page).toHaveURL(/languages=ar/);
  await expect(arabic).toBeFocused(); // filtering never steals focus

  // Select Amelia from the results.
  await expect(workerCard(page, 'Amelia R.')).toContainText('Available for your session');
  await tabTo(page, page.getByRole('link', { name: 'Select Amelia R.' }), 120);
  await page.keyboard.press('Enter');

  // Review: everything being agreed to, then confirm.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Review your replacement' }),
  ).toBeFocused();
  await expect(page.getByText('$174.00')).toBeVisible(); // 3 h × $58.00
  await tabTo(page, page.getByRole('button', { name: 'Confirm replacement' }));
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Replacement support confirmed' }),
  ).toBeFocused();
  await expect(page.getByRole('main')).toContainText('Amelia R.');

  // Reverse tabbing works too (no traps).
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(':focus')).toHaveCount(1);
});
