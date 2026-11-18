import { expect } from '@playwright/test';

export const PASSWORD = 'e2e-password-123';

export function uniqueEmail(tag) {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Create an account through the real sign-up form and land on home. */
export async function signUp(page, { first = 'Robin', tag = 'user' } = {}) {
  const email = uniqueEmail(tag);
  await page.goto('/auth?mode=signup');
  await page.getByLabel('First name').fill(first);
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: `Account menu for ${first}` }).first()).toBeVisible();
  return email;
}

/** Search from the top bar and open the first result in the drawer. */
export async function openFromSearch(page, query) {
  await page.getByRole('combobox', { name: 'Search for a film' }).first().fill(query);
  await page.getByRole('option').first().click();
  return page.getByRole('dialog');
}
