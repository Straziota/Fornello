import { test, expect } from '@playwright/test';
import { dismissTour } from './helpers';
import menu from './fixtures/menu.json';
import recipe from './fixtures/recipe.json';

test.describe('This Week page', () => {
  test('page loads and shows generate button', async ({ page }) => {
    await page.goto('/this-week');
    await dismissTour(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tour="tour-generate"]')).toBeVisible();
  });

  test.describe('with mocked menu generation', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the generate endpoint so tests are free and deterministic
      await page.route('/api/menu/generate', async route => {
        await route.fulfill({ json: menu });
      });
      // Mock recipe loading
      await page.route('/api/menu/recipe', async route => {
        await route.fulfill({ json: recipe });
      });
      // Mock simplify (not relevant to these tests)
      await page.route('/api/menu/simplify', async route => {
        await route.fulfill({ json: { canSimplify: false } });
      });
      // Mock override check
      await page.route('/api/menu/override**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: { exists: false, override: null } });
        } else {
          await route.fulfill({ json: { ok: true } });
        }
      });
    });

    test('generates menu and shows meal cards', async ({ page }) => {
      await page.goto('/this-week');
      await dismissTour(page);
      await page.click('[data-tour="tour-generate"]');

      // Wait for at least one meal card
      await expect(page.locator('[data-tour="tour-meal-card"]').first()).toBeVisible({ timeout: 15_000 });

      // Should show meals from the fixture
      await expect(page.getByText('Pasta al Pomodoro')).toBeVisible();
      await expect(page.getByText('Roast Chicken Thighs')).toBeVisible();
    });

    test('opens meal modal when card is clicked', async ({ page }) => {
      await page.goto('/this-week');
      await dismissTour(page);
      await page.click('[data-tour="tour-generate"]');
      await page.locator('[data-tour="tour-meal-card"]').first().waitFor({ timeout: 15_000 });

      // Click the first non-leftover meal
      await page.getByText('Pasta al Pomodoro').click();

      // Modal should open with meal name
      await expect(page.getByRole('heading', { name: 'Pasta al Pomodoro' })).toBeVisible();
    });
  });
});

test.describe('Meal modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/menu/generate', async route => {
      await route.fulfill({ json: menu });
    });
    await page.route('/api/menu/recipe', async route => {
      await route.fulfill({ json: recipe });
    });
    await page.route('/api/menu/simplify', async route => {
      await route.fulfill({ json: { canSimplify: false } });
    });
    await page.route('/api/menu/override**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { exists: false } });
      } else {
        await route.fulfill({ json: { ok: true } });
      }
    });
    await page.route('/api/feedback**', async route => {
      await route.fulfill({ json: null });
    });
    await page.route('/api/admin/check', async route => {
      await route.fulfill({ json: { isAdmin: false } });
    });

    await page.goto('/this-week');
    await dismissTour(page);
    await page.click('[data-tour="tour-generate"]');
    await page.locator('[data-tour="tour-meal-card"]').first().waitFor({ timeout: 15_000 });
    await page.getByText('Pasta al Pomodoro').click();
    await dismissTour(page);
    // Wait for recipe to load
    await expect(page.getByText('pasta (spaghetti or rigatoni)')).toBeVisible({ timeout: 10_000 });
  });

  test('shows recipe ingredients and instructions', async ({ page }) => {
    await expect(page.getByText('Ingredients')).toBeVisible();
    await expect(page.getByText('pasta (spaghetti or rigatoni)')).toBeVisible();
    await expect(page.getByText('Instructions')).toBeVisible();
    await expect(page.getByText(/Bring a large pot/)).toBeVisible();
  });

  test('shows prep ahead tab', async ({ page }) => {
    await page.click('text=Prep Ahead');
    await expect(page.getByText(/tomato sauce up to 3 days/)).toBeVisible();
  });

  test('opens edit mode', async ({ page }) => {
    await page.click('text=Edit recipe');
    await expect(page.locator('input[placeholder="Amount"]').first()).toBeVisible();
    await expect(page.locator('text=Remember my changes')).toBeVisible();
  });

  test('shows save choice dialog when Remember my changes is clicked', async ({ page }) => {
    await page.click('text=Edit recipe');
    await page.click('text=Remember my changes');

    await expect(page.getByText('How would you like to save?')).toBeVisible();
    await expect(page.getByText('Save to My Recipes too')).toBeVisible();
    await expect(page.getByText('Remember quietly')).toBeVisible();
  });

  test('can cancel edit mode', async ({ page }) => {
    await page.click('text=Edit recipe');
    await page.click('text=Cancel');
    await expect(page.locator('input[placeholder="Amount"]')).not.toBeVisible();
  });

  test('can add and remove an ingredient in edit mode', async ({ page }) => {
    await page.click('text=Edit recipe');

    const amounts = page.locator('input[placeholder="Amount"]');
    const originalCount = await amounts.count();

    await page.click('text=+ Add ingredient');
    await expect(amounts).toHaveCount(originalCount + 1);

    await amounts.last().fill('1 cup');
    await page.locator('input[placeholder="Ingredient"]').last().fill('test ingredient');

    // Remove the last ingredient row using its sibling × button
    const lastRow = amounts.last().locator('..');
    await lastRow.locator('button').click();
    await expect(amounts).toHaveCount(originalCount);
  });

  test('closes when backdrop is clicked', async ({ page }) => {
    await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('heading', { name: 'Pasta al Pomodoro' })).not.toBeVisible();
  });

  test('Remember quietly saves override and closes edit mode', async ({ page }) => {
    let overrideSaved = false;
    await page.route('/api/menu/override', async route => {
      if (route.request().method() === 'POST') overrideSaved = true;
      await route.fulfill({ json: { ok: true } });
    });

    await page.click('text=Edit recipe');
    await page.click('text=Remember my changes');
    await page.click('text=Remember quietly');

    // Edit mode should close — override badge and "Edit my version" button appear
    await expect(page.locator('text=Edit my version')).toBeVisible({ timeout: 5_000 });
    expect(overrideSaved).toBe(true);
  });
});
