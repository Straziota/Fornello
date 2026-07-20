import { test, expect } from '@playwright/test';
import { dismissTour } from './helpers';

test.describe('My Recipes page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).not.toHaveURL('/login');
    await expect(page).not.toHaveURL('/error');
  });

  test('shows add recipe button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Add Recipe/i })).toBeVisible();
  });
});

test.describe("Nonna's Kitchen page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nonnas-kitchen');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).not.toHaveURL('/login');
  });

  test('shows recipe cards or empty state', async ({ page }) => {
    const hasCards = await page.locator('[data-tour="tour-nonna-card"]').count() > 0;
    const hasEmpty = await page.locator('text=/no recipes|add your first|get started/i').count() > 0;
    expect(hasCards || hasEmpty).toBe(true);
  });
});

test.describe('Groceries page', () => {
  test('loads and shows page', async ({ page }) => {
    await page.goto('/groceries');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL('/login');
  });
});

test.describe('Pantry page', () => {
  test('loads and shows add input', async ({ page }) => {
    await page.goto('/pantry');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });
});
