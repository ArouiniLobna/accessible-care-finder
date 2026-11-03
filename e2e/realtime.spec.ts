import { expect, test } from '@playwright/test';
import { announcer, resetScenario, SEARCH_URL, workerCard } from './support';

test.beforeEach(async ({ request }) => resetScenario(request));

test('availability changes in another tab update results live, accessibly, without moving focus', async ({
  page,
  browser,
}) => {
  // Tab 1: the customer is looking at matches.
  await page.goto(SEARCH_URL);
  const amelia = workerCard(page, 'Amelia R.');
  await expect(amelia).toContainText('Available for your session');
  await expect(page.getByText('Live availability on')).toBeVisible();

  // The customer is busy with the sort control.
  const sort = page.getByRole('combobox', { name: 'Sort by' });
  await sort.focus();

  // Tab 2: a presenter (standing in for another customer) changes Amelia's availability.
  const presenter = await browser.newContext();
  const controls = await presenter.newPage();
  await controls.goto('/demo-controls');
  await controls.getByRole('button', { name: 'Make unavailable: Amelia R.' }).click();
  await expect(controls.getByRole('row', { name: /Amelia R\./ })).toContainText('Unavailable');

  // Tab 1 updates without a reload: visible text, not just colour…
  await expect(amelia).toContainText('No longer available');
  await expect(amelia.getByRole('link', { name: 'Select Amelia R.' })).toHaveCount(0);
  // …announced politely…
  await expect(announcer(page)).toHaveText(
    'Amelia R. is no longer available for this support session.',
  );
  await expect(announcer(page)).toHaveAttribute('aria-live', 'polite');
  // …and focus stays exactly where the customer left it.
  await expect(sort).toBeFocused();

  await presenter.close();
});
