import { expect, test } from '@playwright/test';

test.describe('Login', () => {
  test('successfully logs in with a known-valid mock credential', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('jordan.taylor@example.com');
    await page.getByLabel('Password').fill('MockPass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('Jordan Taylor')).toBeVisible();
  });

  test('rejects invalid credentials with a generic error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('jordan.taylor@example.com');
    await page.getByLabel('Password').fill('not-the-right-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
    await expect(page).toHaveURL(/\/login$/);
  });
});
