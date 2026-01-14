import { createFileRoute } from '@tanstack/react-router';

import { betterAuthInstance } from '@/lib/auth';

import { envServer } from '@/env/server';

/**
 * Catch-all route for better-auth API endpoints.
 * This handles all /api/auth/* requests when AUTH_MODE is 'better-auth'.
 *
 * When AUTH_MODE is 'clerk', these routes are not used as Clerk
 * handles auth through their own hosted endpoints.
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => {
        // In Clerk mode, return 404 - Clerk handles its own routes
        if (envServer.AUTH_MODE === 'clerk') {
          return new Response('Not Found', { status: 404 });
        }
        return betterAuthInstance.handler(request);
      },
      POST: ({ request }) => {
        if (envServer.AUTH_MODE === 'clerk') {
          return new Response('Not Found', { status: 404 });
        }
        return betterAuthInstance.handler(request);
      },
    },
  },
});
