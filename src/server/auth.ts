/**
 * Server-side auth exports.
 * This module re-exports from the pluggable auth abstraction layer.
 */

import { getAuthProvider } from '@/lib/auth';

// Re-export the auth provider for server-side operations
export const authProvider = getAuthProvider();

// Helper to get session from request
export async function getSession(request: Request) {
  return authProvider.getSession(request);
}

// Always Clerk mode now
export function isClerkMode() {
  return true;
}

// Type exports
export type {
  AuthContext,
  AuthSession,
  AuthSessionData,
  AuthUser,
} from '@/lib/auth';
