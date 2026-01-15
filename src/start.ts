import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createStart } from '@tanstack/react-start';

/**
 * TanStack Start configuration with Clerk middleware.
 *
 * clerkMiddleware() authenticates requests using Clerk's session cookies
 * and makes auth() function available for server-side auth checks.
 */
export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware()],
  };
});
