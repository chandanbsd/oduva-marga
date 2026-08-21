import { expect, test } from '@playwright/test';

test.describe('Enrollment Application', () => {
  test('successfully submits a valid application and shows confirmation', async ({ page }) => {
    await page.goto('/apply');

    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Lovelace');
    await page.getByLabel('Personal email').fill('ada.lovelace@example.com');

    await page.getByLabel('Enrollment type').click();
    await page.getByRole('option', { name: 'Student' }).click();
    await page.keyboard.press('Escape');

    await page.getByLabel('Street address', { exact: true }).fill('1 Main St');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State / Region').fill('IL');
    await page.getByLabel('Postal code').fill('62704');
    await page.getByLabel('Country').fill('USA');

    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByTestId('confirmation')).toBeVisible();
    await expect(page.getByText('Application submitted')).toBeVisible();
  });

  test('blocks submission and shows inline validation when required fields are missing', async ({ page }) => {
    await page.goto('/apply');

    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByText('First name is required.')).toBeVisible();
    await expect(page.getByText('Select at least one enrollment type.')).toBeVisible();
    await expect(page.getByTestId('confirmation')).toHaveCount(0);
  });
});
