import { createFileRoute } from '@tanstack/react-router';

import { PageNewAddress } from '@/features/treasury-6-demo/page-new-address';

export const Route = createFileRoute('/_app/vaults/$vaultId/addresses/new')({
  component: PageNewAddress,
});
