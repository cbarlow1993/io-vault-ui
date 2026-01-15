import { test } from 'e2e/utils';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from 'e2e/utils/constants';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/overview');
  });

  test('Overview page loads', async ({ page }) => {
    await page.getByTestId('nav-overview').click();
    await page.waitForURL('/overview');
  });

  test('Vaults page loads', async ({ page }) => {
    await page.getByTestId('nav-vaults-section').click();
    await page.getByTestId('nav-vaults').click();
    await page.waitForURL('/vaults');
  });

  test('Signers page loads', async ({ page }) => {
    await page.getByTestId('nav-vaults-section').click();
    await page.getByTestId('nav-signers').click();
    await page.waitForURL('/signers');
  });

  test('Whitelists page loads', async ({ page }) => {
    await page.getByTestId('nav-policies-section').click();
    await page.getByTestId('nav-whitelists').click();
    await page.waitForURL('/policies/whitelists');
  });

  test('Transaction policies page loads', async ({ page }) => {
    await page.getByTestId('nav-policies-section').click();
    await page.getByTestId('nav-transactions').click();
    await page.waitForURL('/policies/transactions');
  });

  test('Identities page loads', async ({ page }) => {
    await page.getByTestId('nav-identities').click();
    await page.waitForURL('/identities');
  });

  test('Address Book page loads', async ({ page }) => {
    await page.getByTestId('nav-address-book').click();
    await page.waitForURL('/address-book');
  });

  test('Compliance page loads', async ({ page }) => {
    await page.getByTestId('nav-compliance').click();
    await page.waitForURL('/compliance');
  });

  test('Settings page loads', async ({ page }) => {
    await page.getByTestId('nav-settings').click();
    await page.waitForURL('**/settings/**');
  });
});
