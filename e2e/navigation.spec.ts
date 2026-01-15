import { test } from 'e2e/utils';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from 'e2e/utils/constants';

test.describe('Navigation - Treasury Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/treasury/overview');
  });

  test('Overview page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-overview').click();
    await page.waitForURL('/treasury/overview');
  });

  test('Vaults page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-vaults').click();
    await page.getByTestId('nav-treasury-vaults-list').click();
    await page.waitForURL('/treasury/vaults');
  });

  test('Signers page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-vaults').click();
    await page.getByTestId('nav-treasury-signers').click();
    await page.waitForURL('/treasury/signers');
  });

  test('Whitelists page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-policies').click();
    await page.getByTestId('nav-treasury-whitelists').click();
    await page.waitForURL('/treasury/policies/whitelists');
  });

  test('Transaction policies page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-policies').click();
    await page.getByTestId('nav-treasury-transactions').click();
    await page.waitForURL('/treasury/policies/transactions');
  });

  test('Address Book page loads', async ({ page }) => {
    await page.getByTestId('nav-treasury-address-book').click();
    await page.waitForURL('/treasury/address-book');
  });
});

test.describe('Navigation - Compliance Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/treasury/overview');
    // Switch to Compliance module
    await page.getByTestId('module-switcher').click();
    await page.getByTestId('module-compliance').click();
    await page.waitForURL('/compliance/overview');
  });

  test('Identities page loads', async ({ page }) => {
    await page.getByTestId('nav-compliance-identities').click();
    await page.waitForURL('/compliance/identities');
  });

  test('Overview page loads', async ({ page }) => {
    await page.getByTestId('nav-compliance-overview').click();
    await page.waitForURL('/compliance/overview');
  });
});

test.describe('Navigation - Global Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/treasury/overview');
    // Switch to Global module
    await page.getByTestId('module-switcher').click();
    await page.getByTestId('module-global').click();
    await page.waitForURL('/global/users');
  });

  test('Users page loads', async ({ page }) => {
    await page.getByTestId('nav-global-users').click();
    await page.waitForURL('/global/users');
  });

  test('Roles page loads', async ({ page }) => {
    await page.getByTestId('nav-global-roles').click();
    await page.waitForURL('/global/roles');
  });
});
