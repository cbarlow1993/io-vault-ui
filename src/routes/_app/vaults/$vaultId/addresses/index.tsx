import { createFileRoute } from '@tanstack/react-router';

import { PageAddresses } from '@/features/vaults/page-addresses';

export const Route = createFileRoute('/_app/vaults/$vaultId/addresses/')({
  component: PageAddresses,
});
