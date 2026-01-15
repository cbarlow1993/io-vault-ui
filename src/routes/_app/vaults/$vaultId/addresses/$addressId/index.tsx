import { createFileRoute } from '@tanstack/react-router';

import { PageAddressDetail } from '@/features/vaults/page-address-detail';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/addresses/$addressId/'
)({
  component: PageAddressDetail,
});
