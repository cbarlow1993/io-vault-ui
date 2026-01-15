import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistEdit } from '@/features/policies/page-whitelist-form';

export const Route = createFileRoute(
  '/_app/treasury/policies/whitelists/$whitelistId/edit'
)({
  component: PageWhitelistEdit,
});
