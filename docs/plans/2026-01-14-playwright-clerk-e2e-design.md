# Playwright E2E Testing with Clerk Authentication

## Overview

Configure Playwright e2e tests to work with Clerk authentication using the official `@clerk/testing` package.

## Approach

Using Clerk's Testing Tokens approach:
- `@clerk/testing` package provides utilities to bypass bot detection
- Tests interact with real Clerk UI components (email + password)
- Storage state is saved and reused across tests

## Implementation Plan

### 1. Package Installation

```bash
pnpm add -D @clerk/testing
```

### 2. Environment Variables

**Required variables:**

| Variable | Purpose |
|----------|---------|
| `CLERK_PUBLISHABLE_KEY` | Clerk instance identifier (existing) |
| `CLERK_SECRET_KEY` | Backend API authentication |
| `E2E_CLERK_USER_EMAIL` | Test user email |
| `E2E_CLERK_USER_PASSWORD` | Test user password |

**Add to `.env`:**
```
CLERK_SECRET_KEY=sk_test_xxxxx
E2E_CLERK_USER_EMAIL=test@example.com
E2E_CLERK_USER_PASSWORD=secure-test-password
```

### 3. Global Clerk Setup

**Create `e2e/setup/clerk.setup.ts`:**

```typescript
import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

setup.describe.configure({ mode: 'serial' })

setup('clerk setup', async ({}) => {
  await clerkSetup()
})
```

### 4. Update Playwright Config

**Update `playwright.config.ts` projects:**

```typescript
projects: [
  { name: 'clerk-setup', testMatch: /clerk\.setup\.ts/ },
  { name: 'setup', testMatch: /auth\.setup\.ts/, dependencies: ['clerk-setup'] },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],
  },
  // ... other browsers
]
```

### 5. Update Auth Setup

**Update `e2e/setup/auth.setup.ts`:**

```typescript
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect } from '@playwright/test'
import { test as setup } from 'e2e/utils'
import { ADMIN_EMAIL, ADMIN_FILE, ADMIN_PASSWORD } from 'e2e/utils/constants'

setup('authenticate as admin', async ({ page }) => {
  await setupClerkTestingToken({ page })

  await page.goto('/sign-in')

  // Fill Clerk sign-in form
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /continue/i }).click()

  // Wait for authenticated redirect
  await page.waitForURL('/overview')
  await expect(page.getByTestId('layout-treasury-6')).toBeVisible()

  await page.context().storageState({ path: ADMIN_FILE })
})
```

### 6. Update Login Utility

**Update `e2e/utils/page.ts`:**

```typescript
import { setupClerkTestingToken } from '@clerk/testing/playwright'

page.login = async function login(input: { email: string; password: string }) {
  await setupClerkTestingToken({ page })

  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(input.email)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel('Password').fill(input.password)
  await page.getByRole('button', { name: /continue/i }).click()
}
```

### 7. Update Constants

**Update `e2e/utils/constants.ts`:**

```typescript
const AUTH_FILE_BASE = 'e2e/.auth'

export const ADMIN_FILE = `${AUTH_FILE_BASE}/admin.json`
export const ADMIN_EMAIL = process.env.E2E_CLERK_USER_EMAIL!
export const ADMIN_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD!
```

### 8. Update CI/CD

**Update `.github/workflows/e2e-tests.yml`:**

Add environment variables:
```yaml
env:
  VITE_BASE_URL: http://localhost:3000
  CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  E2E_CLERK_USER_EMAIL: ${{ secrets.E2E_CLERK_USER_EMAIL }}
  E2E_CLERK_USER_PASSWORD: ${{ secrets.E2E_CLERK_USER_PASSWORD }}
```

Remove old auth-related env vars and database service if no longer needed.

**GitHub Secrets to create:**
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `E2E_CLERK_USER_EMAIL`
- `E2E_CLERK_USER_PASSWORD`

## Test User Setup

Create a dedicated test user in your Clerk development instance:
1. Go to Clerk Dashboard > Users
2. Create a user with known email/password
3. Use these credentials in your environment variables

## Files to Modify

- `package.json` - Add `@clerk/testing` dependency
- `playwright.config.ts` - Add clerk-setup project
- `e2e/setup/clerk.setup.ts` - New file for Clerk global setup
- `e2e/setup/auth.setup.ts` - Update for Clerk authentication
- `e2e/utils/page.ts` - Update login utility
- `e2e/utils/constants.ts` - Update constants for Clerk credentials
- `.github/workflows/e2e-tests.yml` - Add Clerk environment variables
