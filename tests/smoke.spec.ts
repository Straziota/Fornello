import { test, expect } from '@playwright/test';
import { dismissTour } from './helpers';

const PAGES = [
  { path: '/',                label: 'Home' },
  { path: '/this-week',       label: 'This Week' },
  { path: '/groceries',       label: 'Groceries' },
  { path: '/pantry',          label: 'Pantry' },
  { path: '/recipes',         label: 'My Recipes' },
  { path: '/nonnas-kitchen',  label: "Nonna's Kitchen" },
  { path: '/on-the-fly',      label: 'On the Fly' },
  { path: '/something-sweet', label: 'Something Sweet' },
  { path: '/traditions',      label: 'Traditions' },
  { path: '/find-a-recipe',   label: 'Find a Recipe' },
  { path: '/history',         label: 'Archive' },
  { path: '/settings',        label: 'Settings' },
];

for (const { path, label } of PAGES) {
  test(`${label} page loads`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(path);
    await dismissTour(page);
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');

    expect(errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('hydrat')
    )).toHaveLength(0);
  });
}

test('home page shows all navigation tiles', async ({ page }) => {
  await page.goto('/');
  await dismissTour(page);
  const main = page.getByRole('main');
  const tiles = ['This Week', 'From the Market', 'Recipes', "Nonna's Kitchen", 'Settings'];
  for (const label of tiles) {
    await expect(main.getByText(label)).toBeVisible();
  }
});

test('unauthenticated users are redirected to login', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto('/this-week');
  await expect(page).toHaveURL('/login');
  await context.close();
});
