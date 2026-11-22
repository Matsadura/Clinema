import { expect, test } from '@playwright/test';
import { openFromSearch, signUp } from './helpers.js';

test('series: mood picks, details with trailer and providers, and the library', async ({ page }) => {
  await signUp(page, { tag: 'series' });
  await expect(page.getByRole('region', { name: 'Trending series' }).getByText('Quiet Harbour')).toBeVisible();

  await page.getByRole('button', { name: 'Series', exact: true }).click();
  await page.getByRole('button', { name: 'Calm', exact: true }).click();
  await page.getByRole('button', { name: 'Find series' }).click();
  const results = page.getByRole('region', { name: 'Recommendations' });
  await expect(results.getByText(/\d+ series for Calm/)).toBeVisible({ timeout: 20_000 });
  const first = results.getByRole('button', { name: /, view details$/ }).first();
  const title = (await first.getAttribute('aria-label')).replace(/ \(\d{4}\), view details$/, '');
  await expect(results.getByText('Series').first()).toBeVisible();

  await results.getByRole('button', { name: `Add to watchlist: ${title}` }).click();
  await page.goto('/library?tab=saved');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  const drawer = await openFromSearch(page, 'Slow Rivers');
  await expect(drawer.getByText('Series').first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Play trailer: Slow Rivers' }).click();
  await expect(drawer.locator('iframe')).toHaveAttribute('src', /embed\/e2eSeries01/);
  await expect(drawer.getByRole('region', { name: 'Where to watch' }).getByText('Netflix')).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'View on TMDB' })).toHaveAttribute('href', 'https://www.themoviedb.org/tv/8004');
});
