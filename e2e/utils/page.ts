import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { Page } from '@playwright/test';
import { CustomFixture } from 'e2e/utils/types';

import { FileRouteTypes } from '@/routeTree.gen';

interface PageUtils {
  /**
   * Utility used to authenticate a user on the app using Clerk
   */
  login: (input: { email: string; password: string }) => Promise<void>;

  /**
   * Override of the `page.goto` method with typed routes from the app
   */
  to: (
    url: FileRouteTypes['to'],
    options?: Parameters<Page['goto']>[1]
  ) => ReturnType<Page['goto']>;
}

export type ExtendedPage = { page: PageUtils };

export const pageWithUtils: CustomFixture<Page & PageUtils> = async (
  { page },
  apply
) => {
  page.login = async function login(input: {
    email: string;
    password: string;
  }) {
    // Setup Clerk testing token to bypass bot detection
    await setupClerkTestingToken({ page });

    // Navigate to sign-in page
    await page.goto('/login');

    // Fill email and continue
    await page.getByLabel('Email address').fill(input.email);
    await page.getByRole('button', { name: /continue/i }).click();

    // Fill password and submit
    await page.getByLabel('Password', { exact: true }).fill(input.password);
    await page.getByRole('button', { name: /continue/i }).click();
  };

  page.to = page.goto;

  await apply(page);
};
