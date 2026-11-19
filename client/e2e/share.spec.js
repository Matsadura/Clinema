import { expect, test } from '@playwright/test';
import { openFromSearch, signUp } from './helpers.js';

test('a shared watchlist is visible to strangers until sharing is turned off', async ({ page, browser }) => {
  await signUp(page, { first: 'Sasha', tag: 'share' });
  const drawer = await openFromSearch(page, 'Glass Mountain');
  await drawer.getByRole('button', { name: 'Watchlist' }).click();
  await expect(drawer.getByRole('button', { name: 'On watchlist' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/library?tab=saved');
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('switch', { name: 'Public link' }).click();
  const link = await page.getByRole('textbox', { name: 'Share link' }).inputValue();
  expect(link).toMatch(/\/w\/[A-Za-z0-9_-]{20,}$/);

  const stranger = await browser.newContext();
  const view = await stranger.newPage();
  await view.goto(link);
  await expect(view.getByRole('heading', { level: 1, name: 'Sasha’s watchlist' })).toBeVisible();
  await expect(view.getByRole('heading', { name: 'Glass Mountain' })).toBeVisible();

  await page.getByRole('switch', { name: 'Public link' }).click();
  await expect(page.getByRole('switch', { name: 'Public link' })).toHaveAttribute('aria-checked', 'false');
  await view.reload();
  await expect(view.getByText('This list is private or no longer shared.')).toBeVisible();
  await stranger.close();
});
