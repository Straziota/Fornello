import { test, expect } from '@playwright/test';

test.describe('login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows sign in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid login')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL('/login');
  });

  test('link to signup page works', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Create one');
    await expect(page).toHaveURL('/signup');
  });
});

test.describe('signup page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows create account form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('link back to login works', async ({ page }) => {
    await page.goto('/signup');
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/login');
  });
});

test('authenticated user is redirected away from login', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL('/');
});
