import { createClerkProvider } from './clerk-provider';
import type { AuthProvider } from './types';

// Re-export types
export type {
  AuthContext,
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
 * Singleton instance of the auth provider.
 * Created lazily on first access.
 */
let authProviderInstance: AuthProvider | null = null;

/**
 * Get the auth provider for the current deployment mode.
 * Currently always returns the Clerk provider.
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
  if (!authProviderInstance) {
    authProviderInstance = createClerkProvider();
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
 * Always returns true since we only support Clerk now.
 */
export function isClerkMode(): boolean {
  return true;
}

// Export provider factory for direct usage if needed
export { createClerkProvider } from './clerk-provider';
