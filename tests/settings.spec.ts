import { test, expect } from '@playwright/test';
import { dismissTour } from './helpers';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
  });

  test('loads and shows family size stepper', async ({ page }) => {
    await expect(page.getByText('Family Size')).toBeVisible();
    // Family size uses +/- buttons, not a number input
    await expect(page.locator('button:has-text("+")').first()).toBeVisible();
  });

  test('save button is present', async ({ page }) => {
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
  });

  test('can increment family size and save', async ({ page }) => {
    let saved = false;
    await page.route('/api/settings', async route => {
      if (route.request().method() === 'POST') saved = true;
      await route.fulfill({ json: { ok: true } });
    });

    await page.locator('button:has-text("+")').first().click();
    await page.click('button:has-text("Save Settings")');

    await expect(page.locator('text=Settings saved')).toBeVisible({ timeout: 5_000 });
    expect(saved).toBe(true);
  });
});
