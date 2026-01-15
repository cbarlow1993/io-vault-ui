import { expect, test } from 'e2e/utils';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from 'e2e/utils/constants';

test.describe('Vaults', () => {
  test.beforeEach(async ({ page }) => {
    await page.login({ email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD });
    await page.waitForURL('/overview');
  });

  test('Vaults page loads and displays table', async ({ page }) => {
    await page.getByTestId('nav-vaults-section').click();
    await page.getByTestId('nav-vaults').click();
    await page.waitForURL('/vaults');

    // Verify table is visible
    await expect(page.getByTestId('vaults-table')).toBeVisible();
  });

  test('Vaults table displays vault rows', async ({ page }) => {
    await page.getByTestId('nav-vaults-section').click();
    await page.getByTestId('nav-vaults').click();
    await page.waitForURL('/vaults');

    // Verify at least one vault row exists
    const table = page.getByTestId('vaults-table');
    await expect(table).toBeVisible();

    // Check that rows are present in the table body
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('Create vault flow', async ({ page }) => {
    // Navigate to vaults page
    await page.getByTestId('nav-vaults-section').click();
    await page.getByTestId('nav-vaults').click();
    await page.waitForURL('/vaults');

    // Click create vault button
    await page.getByTestId('vaults-create-button').click();
    await page.waitForURL('/vaults/new');

    // Fill in vault name
    await page.getByTestId('vault-name-input').fill('Test Vault E2E');

    // Add a signer
    await page.getByTestId('vault-add-signer-button').click();
    // Click the first available signer option
    await page.locator('[data-testid^="vault-signer-option-"]').first().click();

    // Submit the form
    await page.getByTestId('vault-submit-button').click();

    // Should redirect back to vaults list
    await page.waitForURL('/vaults');
  });
});
