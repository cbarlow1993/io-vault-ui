import { test } from 'e2e/utils';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from 'e2e/utils/constants';

test.describe('Login flow', () => {
  test('Login with Clerk redirects to /treasury/overview', async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/treasury/overview');
  });
});
