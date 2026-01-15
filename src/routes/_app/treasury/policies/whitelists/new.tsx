import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistCreate } from '@/features/policies/page-whitelist-form';

export const Route = createFileRoute('/_app/treasury/policies/whitelists/new')({
  component: PageWhitelistCreate,
});
