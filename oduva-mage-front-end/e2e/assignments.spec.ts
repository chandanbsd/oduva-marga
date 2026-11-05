import { expect, Page, test } from '@playwright/test';

const TEACHER = { email: 'alex.morgan@example.com', password: 'MockPass789!' };
const JORDAN = { email: 'jordan.taylor@example.com', password: 'MockPass123!' };
const SAM = { email: 'sam.rivera@example.com', password: 'MockPass456!' };

// The auth store is memory-only, so after logging in we navigate by clicking links, never page.goto.
async function login(page: Page, user: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/home$/);
}

async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log out' }).click();
}

test.describe('Assignments', () => {
  test('teacher creates; students submit; teacher grades; student sees the grade', async ({ page }) => {
    const title = `Essay ${Date.now()}`;

    await login(page, TEACHER);
    await page.getByRole('link', { name: 'Manage assignments' }).click();
    await page.getByRole('link', { name: 'New assignment' }).click();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Question').fill('Describe your favourite book.');
    await page.getByLabel('Maximum marks').fill('10');
    await page.getByRole('button', { name: 'Create assignment' }).click();
    await expect(page.getByRole('link', { name: title })).toBeVisible();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await logout(page);

    await login(page, JORDAN);
    await page.getByRole('link', { name: 'My assignments' }).click();
    await page.getByRole('link', { name: title }).click();
    await page.getByLabel('Answer').fill('Dune is my favourite.');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Dune is my favourite.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit answer' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to assignments' }).click();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await logout(page);

    await login(page, SAM);
    await page.getByRole('link', { name: 'My assignments' }).click();
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('button', { name: 'Upload file' }).click();
    await page.getByLabel('File').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello from sam')
    });
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('notes.txt')).toBeVisible();
    await page.getByRole('link', { name: 'Back to assignments' }).click();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await logout(page);

    await login(page, TEACHER);
    await page.getByRole('link', { name: 'Manage assignments' }).click();
    await page.getByRole('link', { name: title }).click();
    await expect(page.getByText('Jordan Taylor', { exact: true })).toBeVisible();
    await expect(page.getByText('Dune is my favourite.')).toBeVisible();
    await expect(page.getByText('Sam Rivera', { exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('notes.txt');

    await page.getByLabel('Grade for Jordan Taylor').fill('7.5');
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Jordan Taylor' })
      .getByRole('button', { name: 'Save grade' })
      .click();
    await expect(page.getByText('Graded: 7.5 / 10')).toBeVisible();
    await page.getByRole('link', { name: 'Back to assignments' }).click();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await logout(page);

    await login(page, JORDAN);
    await page.getByRole('link', { name: 'My assignments' }).click();
    await page.getByRole('link', { name: title }).click();
    await expect(page.getByText('Grade: 7.5 / 10')).toBeVisible();
  });

  test("a student's landing page links only to student assignments", async ({ page }) => {
    await login(page, JORDAN);

    await expect(page.getByRole('link', { name: 'My assignments' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage assignments' })).toHaveCount(0);
  });
});
