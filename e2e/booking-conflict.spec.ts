import { expect, test } from '@playwright/test';
import { resetScenario, SEARCH_URL, workerCard } from './support';

test.beforeEach(async ({ request }) => resetScenario(request));

test('a stale booking gets a real 409 and the customer can recover with their filters intact', async ({
  page,
  request,
}) => {
  // The customer filters, then selects Amelia (slot version 41).
  await page.goto(`${SEARCH_URL}?languages=ar`);
  await workerCard(page, 'Amelia R.').getByRole('link', { name: 'Select Amelia R.' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Review your replacement' }),
  ).toBeVisible();

  // Meanwhile her slot changes and this browser never hears about it (no SSE broadcast),
  // exactly as if the event were lost: the page still believes version 41.
  const change = await request.post('/api/demo/availability/availability_017', {
    data: { status: 'UNAVAILABLE', broadcast: false },
  });
  expect(change.ok()).toBe(true);
  await expect(page.getByRole('button', { name: 'Confirm replacement' })).toBeVisible();

  const responsePromise = page.waitForResponse('**/api/replacement-bookings');
  await page.getByRole('button', { name: 'Confirm replacement' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({ code: 'WORKER_NO_LONGER_AVAILABLE' });

  // Plain explanation, focus moved to it because it answers the customer's own action.
  const heading = page.getByRole('heading', {
    name: /Amelia R\. is no longer available for this session/,
  });
  await expect(heading).toBeFocused();
  await expect(page.getByText(/nothing has been booked/i)).toBeVisible();

  // Back to refreshed matches, filters preserved, Amelia no longer offered.
  await page.getByRole('link', { name: 'View updated matches' }).click();
  await expect(page).toHaveURL(/languages=ar/);
  await expect(page.getByRole('checkbox', { name: 'Arabic' })).toBeChecked();
  await expect(workerCard(page, 'Amelia R.')).toHaveCount(0);
});
