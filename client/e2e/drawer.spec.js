import { expect, test } from '@playwright/test';
import { openFromSearch } from './helpers.js';

test('film drawer plays the trailer in place and shows where to watch and cast', async ({ page }) => {
  await page.goto('/');
  const drawer = await openFromSearch(page, 'Night Harbour');
  await expect(drawer.getByRole('heading', { name: 'Night Harbour' }).first()).toBeVisible();

  await drawer.getByRole('button', { name: 'Play trailer: Night Harbour' }).click();
  await expect(drawer.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/e2eTrailer1\?autoplay=1/);

  const where = drawer.getByRole('region', { name: 'Where to watch' });
  await expect(where.getByText('Netflix')).toBeVisible();
  await expect(where.getByText('Apple TV')).toBeVisible();

  await drawer.getByRole('region', { name: 'More like this' }).getByRole('button').first().click();
  await expect(drawer.locator('h2').first()).not.toHaveText('Night Harbour');

  await drawer.getByRole('link', { name: /Ada Marlowe/ }).click();
  await expect(page).toHaveURL(/\/person\/7001$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ada Marlowe' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Films' }).getByRole('listitem')).toHaveCount(6);
});
