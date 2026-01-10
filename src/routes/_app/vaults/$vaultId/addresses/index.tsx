import { createFileRoute } from '@tanstack/react-router';

import { PageAddresses } from '@/features/treasury-6-demo/page-addresses';

export const Route = createFileRoute('/_app/vaults/$vaultId/addresses/')({
  component: PageAddresses,
});
