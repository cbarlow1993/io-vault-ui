import { createMiddleware } from '@tanstack/react-start';

import { getAuthProvider } from './index';
import type { AuthContext } from './types';

// Type for the context with potential request
interface ContextWithRequest {
  request?: Request;
  [key: string]: unknown;
}

// Type for the context with auth
interface ContextWithAuth {
  auth?: AuthContext;
  [key: string]: unknown;
}

/**
 * TanStack Start middleware that attaches auth context to all requests.
 * Uses the pluggable auth provider to get session data.
 *
 * @example
 * // In your route file
 * import { authMiddleware } from '@/lib/auth/middleware';
 *
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: async ({ context }) => {
 *     if (!context.auth?.user) {
 *       throw redirect({ to: '/login' });
 *     }
 *   },
 * });
 */
export const authMiddleware = createMiddleware().server(
  async ({ next, context }) => {
    const provider = getAuthProvider();

    // Get the request from context (TanStack Start provides this)
    const typedContext = context as unknown as ContextWithRequest;
    const request = typedContext?.request;

    const emptyAuth: AuthContext = {
      user: null,
      session: null,
    };

    if (!request) {
      // No request available, return empty auth context
      return next({
        context: {
          ...(typeof context === 'object' && context !== null ? context : {}),
          auth: emptyAuth,
        },
      });
    }

    try {
      const sessionData = await provider.getSession(request);

      const authContext: AuthContext = {
        user: sessionData?.user ?? null,
        session: sessionData?.session ?? null,
      };

      return next({
        context: {
          ...(typeof context === 'object' && context !== null ? context : {}),
          auth: authContext,
        },
      });
    } catch (error) {
      console.error('Auth middleware error:', error);

      return next({
        context: {
          ...(typeof context === 'object' && context !== null ? context : {}),
          auth: emptyAuth,
        },
      });
    }
  }
);

/**
 * Middleware that requires authentication.
 * Throws an error if user is not authenticated.
 *
 * @example
 * // In your route file
 * import { requireAuthMiddleware } from '@/lib/auth/middleware';
 *
 * export const Route = createFileRoute('/dashboard')({
 *   middleware: [requireAuthMiddleware],
 * });
 */
export const requireAuthMiddleware = createMiddleware().server(
  async ({ next, context }) => {
    const typedContext = context as unknown as ContextWithAuth;
    const auth = typedContext?.auth;

    if (!auth?.user) {
      throw new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    return next({
      context: typeof context === 'object' && context !== null ? context : {},
    });
  }
);

/**
 * Middleware that requires a specific role.
 *
 * @param allowedRoles - Array of roles that are allowed
 *
 * @example
 * import { createRoleMiddleware } from '@/lib/auth/middleware';
 *
 * const adminOnly = createRoleMiddleware(['admin']);
 *
 * export const Route = createFileRoute('/admin')({
 *   middleware: [adminOnly],
 * });
 */
export function createRoleMiddleware(allowedRoles: Array<'user' | 'admin'>) {
  return createMiddleware().server(async ({ next, context }) => {
    const typedContext = context as unknown as ContextWithAuth;
    const auth = typedContext?.auth;

    if (!auth?.user) {
      throw new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    const userRole = auth.user.role ?? 'user';

    if (!allowedRoles.includes(userRole)) {
      throw new Response(null, {
        status: 403,
        statusText: 'Forbidden',
      });
    }

    return next({
      context: typeof context === 'object' && context !== null ? context : {},
    });
  });
}

/**
 * Helper type for route context with auth
 */
export interface RouteContextWithAuth {
  auth: AuthContext;
}
