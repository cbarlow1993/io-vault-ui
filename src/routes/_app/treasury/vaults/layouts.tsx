import { createFileRoute } from '@tanstack/react-router';

import { PageVaultDetailLayouts } from '@/features/vaults/page-vault-detail-layouts';

export const Route = createFileRoute('/_app/treasury/vaults/layouts')({
  component: PageVaultDetailLayouts,
});
