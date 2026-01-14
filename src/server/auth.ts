/**
 * Server-side auth exports.
 * This module re-exports from the pluggable auth abstraction layer.
 */

import { betterAuthInstance, getAuthProvider } from '@/lib/auth';

import { envServer } from '@/env/server';

// Re-export the better-auth instance for API routes when in better-auth mode
export const auth = betterAuthInstance;

// Re-export the auth provider for server-side operations
export const authProvider = getAuthProvider();

// Helper to get session from request
export async function getSession(request: Request) {
  return authProvider.getSession(request);
}

// Helper to check if using Clerk mode
export function isClerkMode() {
  return envServer.AUTH_MODE === 'clerk';
}

// Helper to check if using better-auth mode
export function isBetterAuthMode() {
  return envServer.AUTH_MODE === 'better-auth';
}

// Type exports
export type {
  AuthContext,
  AuthSession,
  AuthSessionData,
  AuthUser,
} from '@/lib/auth';
export type { BetterAuthInstance as Auth } from '@/lib/auth/better-auth-instance';
