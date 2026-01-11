import { createFileRoute } from '@tanstack/react-router';

import { PageVaultDetailTabs } from '@/features/treasury-6-demo/page-vault-detail-tabs';

export const Route = createFileRoute('/_app/vaults/$vaultId/')({
  component: PageVaultDetailTabs,
});
