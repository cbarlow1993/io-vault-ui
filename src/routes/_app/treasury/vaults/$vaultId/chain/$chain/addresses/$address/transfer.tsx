import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageAddressTransfer } from '@/features/vaults/page-address-transfer';

export const Route = createFileRoute(
  '/_app/treasury/vaults/$vaultId/chain/$chain/addresses/$address/transfer'
)({
  component: PageAddressTransfer,
  validateSearch: zodValidator(
    z.object({
      asset: z.string().optional(),
    })
  ),
});
