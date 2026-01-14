import { expect, test } from 'e2e/utils';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from 'e2e/utils/constants';

test.describe('Login flow', () => {
  test('Login with Clerk', async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/overview');
    await expect(page.getByTestId('layout-treasury-6')).toBeVisible();
  });

  test('Login with redirect', async ({ page }) => {
    await page.to('/overview');
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/overview');
    await expect(page.getByTestId('layout-treasury-6')).toBeVisible();
  });
});
