import { expect, test } from '@playwright/test';
import { signUp } from './helpers.js';

test('signed-up viewer gets mood picks, likes one and finds it in the library', async ({ page }) => {
  await signUp(page, { tag: 'recs' });

  await page.getByRole('button', { name: 'Calm', exact: true }).click();
  await page.getByRole('button', { name: 'Find films' }).click();

  const results = page.getByRole('region', { name: 'Recommendations' });
  const cards = results.getByRole('button', { name: /, view details$/ });
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  expect(await cards.count()).toBeGreaterThanOrEqual(8);

  const label = await cards.first().getAttribute('aria-label');
  const title = label.replace(/ \(\d{4}\), view details$/, '');
  await results.getByRole('button', { name: `Like: ${title}` }).click();
  await expect(results.getByRole('button', { name: `Unlike: ${title}` })).toBeVisible();

  await page.goto('/library?tab=liked');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

});
