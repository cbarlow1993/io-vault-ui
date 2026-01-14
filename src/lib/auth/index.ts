import { envServer } from '@/env/server';

import { createBetterAuthProvider } from './better-auth-provider';
import { createClerkProvider } from './clerk-provider';
import type { AuthMode, AuthProvider } from './types';

// Re-export types
export type {
  AuthContext,
  AuthMode,
  AuthProvider,
  AuthResponse,
  AuthSession,
  AuthSessionData,
  AuthUser,
  Organization,
  SessionUser,
  SignInCredentials,
  SignUpData,
  UseSessionResult,
} from './types';

// Re-export permissions
export {
  permissions,
  type Role,
  rolesNames,
  type Statement,
  zRole,
} from './permissions';

/**
 * Get the current auth mode from environment.
 * Defaults to 'better-auth' for on-prem deployments.
 */
export function getAuthMode(): AuthMode {
  return envServer.AUTH_MODE || 'better-auth';
}

/**
 * Singleton instance of the auth provider.
 * Created lazily on first access.
 */
let authProviderInstance: AuthProvider | null = null;

/**
 * Get the auth provider for the current deployment mode.
 * Uses factory pattern to create the appropriate provider.
 *
 * @returns The configured auth provider instance
 *
 * @example
 * // Server-side usage
 * const provider = getAuthProvider();
 * const session = await provider.getSession(request);
 *
 * @example
 * // Client-side usage (in React components)
 * const provider = getAuthProvider();
 * const { data, isPending } = provider.useSession();
 */
export function getAuthProvider(): AuthProvider {
  if (authProviderInstance) {
    return authProviderInstance;
  }

  const mode = getAuthMode();

  switch (mode) {
    case 'clerk':
      authProviderInstance = createClerkProvider();
      break;
    case 'better-auth':
    default:
      authProviderInstance = createBetterAuthProvider();
      break;
  }

  return authProviderInstance;
}

/**
 * Reset the auth provider instance.
 * Useful for testing or when auth mode changes.
 */
export function resetAuthProvider(): void {
  authProviderInstance = null;
}

/**
 * Check if currently in Clerk mode.
 */
export function isClerkMode(): boolean {
  return getAuthMode() === 'clerk';
}

/**
 * Check if currently in better-auth mode.
 */
export function isBetterAuthMode(): boolean {
  return getAuthMode() === 'better-auth';
}

// Export provider factories for direct usage if needed
export { createBetterAuthProvider } from './better-auth-provider';
export { createClerkProvider } from './clerk-provider';

// Export better-auth client for direct usage when in better-auth mode
export { betterAuthClient } from './better-auth-client';

// Export the raw better-auth instance for the API route handler
export { auth as betterAuthInstance } from './better-auth-instance';
