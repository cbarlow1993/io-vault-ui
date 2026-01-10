import { createFileRoute } from '@tanstack/react-router';

import { PageVaultDetail } from '@/features/treasury-6-demo/page-vault-detail';

export const Route = createFileRoute('/_app/vaults/$vaultId/')({
  component: PageVaultDetail,
});
