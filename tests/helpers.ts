import { Page } from '@playwright/test';

export async function dismissTour(page: Page) {
  // Dismiss the welcome prompt ("Would you like a quick tour?")
  try {
    await page.locator("text=Skip, I'll explore on my own").click({ timeout: 2_000 });
  } catch { /* not visible */ }

  // Dismiss the step-by-step tour if it started
  try {
    await page.locator('text=Skip tour').click({ timeout: 1_000 });
  } catch { /* not visible */ }
}
