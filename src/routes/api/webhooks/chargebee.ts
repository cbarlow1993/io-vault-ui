import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/webhooks/chargebee')({
  POST: async () => {
    // TODO: Re-implement when database layer is added
    // Chargebee webhook handling is temporarily disabled
    // See: docs/plans/2026-01-13-remove-prisma-better-auth.md
    console.log('Chargebee webhook received but handler is disabled');

    return new Response(JSON.stringify({ received: true, processed: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
