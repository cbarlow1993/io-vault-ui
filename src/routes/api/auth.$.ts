import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: () => {
    return new Response('Authentication is handled by Clerk', { status: 404 });
  },
  POST: () => {
    return new Response('Authentication is handled by Clerk', { status: 404 });
  },
});
