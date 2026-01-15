import { createFileRoute } from '@tanstack/react-router';

import { PageAddressAssets } from '@/features/vaults/page-address-assets';

export const Route = createFileRoute(
  '/_app/treasury/vaults/$vaultId/chain/$chain/addresses/$address/'
)({
  component: PageAddressAssets,
});
