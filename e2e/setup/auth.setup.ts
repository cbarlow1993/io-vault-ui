import { expect } from '@playwright/test';
import { test as setup } from 'e2e/utils';
import {
  ADMIN_FILE,
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
} from 'e2e/utils/constants';

/**
 * Clerk authentication setup for e2e tests
 * @see https://clerk.com/docs/guides/development/testing/playwright/overview
 * @see https://playwright.dev/docs/auth#multiple-signed-in-roles
 */

setup('authenticate with Clerk', async ({ page }) => {
  await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
  await page.waitForURL('/overview');
  await page.context().storageState({ path: ADMIN_FILE });
});
