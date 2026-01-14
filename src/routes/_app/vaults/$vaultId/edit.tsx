import { createFileRoute } from '@tanstack/react-router';

import { PageVaultEdit } from '@/features/vaults/page-vault-form';

export const Route = createFileRoute('/_app/vaults/$vaultId/edit')({
  component: PageVaultEdit,
});
