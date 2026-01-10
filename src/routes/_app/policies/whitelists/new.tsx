import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistCreate } from '@/features/treasury-6-demo/page-whitelist-form';

export const Route = createFileRoute('/_app/policies/whitelists/new')({
  component: PageWhitelistCreate,
});
