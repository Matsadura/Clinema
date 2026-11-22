import { expect, test } from '@playwright/test';

test('mobile: home, menu and search work without horizontal scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Search films and series' }).click();
  await page.getByRole('combobox', { name: 'Search films and series' }).last().fill('Paper');
  await page.getByRole('option').first().click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Paper Lanterns' }).first()).toBeVisible();
});

test('mobile: the app is installable (manifest and service worker)', async ({ page }) => {
  await page.goto('/');
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  expect(manifest.display).toBe('standalone');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()));
});
