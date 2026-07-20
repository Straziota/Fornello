import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local.\n' +
      'Create a dedicated test account in Supabase and add the credentials.'
    );
  }

  // If auth state already exists and is recent (< 1 hour), skip re-login
  if (fs.existsSync(authFile)) {
    const age = Date.now() - fs.statSync(authFile).mtimeMs;
    if (age < 60 * 60 * 1000) return;
  }

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to home
  await expect(page).toHaveURL('/', { timeout: 10_000 });

  await page.context().storageState({ path: authFile });
});
