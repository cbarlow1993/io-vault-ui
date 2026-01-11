import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageAddressTransfer } from '@/features/treasury-6-demo/page-address-transfer';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/chain/$chain/addresses/$address/transfer'
)({
  component: PageAddressTransfer,
  validateSearch: zodValidator(
    z.object({
      asset: z.string().optional(),
    })
  ),
});
