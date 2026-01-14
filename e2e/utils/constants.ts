const AUTH_FILE_BASE = 'e2e/.auth';

// Clerk test user credentials from environment
export const E2E_USER_EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? '';
export const E2E_USER_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD ?? '';

// Storage state files
export const USER_FILE = `${AUTH_FILE_BASE}/user.json`;
export const ADMIN_FILE = `${AUTH_FILE_BASE}/admin.json`;

// Legacy exports for backwards compatibility
export const USER_EMAIL = E2E_USER_EMAIL;
export const ADMIN_EMAIL = E2E_USER_EMAIL;
