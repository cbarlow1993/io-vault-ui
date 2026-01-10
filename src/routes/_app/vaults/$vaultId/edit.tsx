import { createFileRoute } from '@tanstack/react-router';

import { PageVaultEdit } from '@/features/treasury-6-demo/page-vault-form';

export const Route = createFileRoute('/_app/vaults/$vaultId/edit')({
  component: PageVaultEdit,
});
