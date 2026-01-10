import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistEdit } from '@/features/treasury-6-demo/page-whitelist-form';

export const Route = createFileRoute(
  '/_app/policies/whitelists/$whitelistId/edit'
)({
  component: PageWhitelistEdit,
});
