import { createFileRoute } from '@tanstack/react-router';

import { PageAddressAssets } from '@/features/treasury-6-demo/page-address-assets';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/chain/$chain/addresses/$address/'
)({
  component: PageAddressAssets,
});
