import { createFileRoute } from '@tanstack/react-router';

import { PageVaultDetailTabs } from '@/features/vaults/page-vault-detail-tabs';

export const Route = createFileRoute('/_app/vaults/$vaultId/')({
  component: PageVaultDetailTabs,
});
