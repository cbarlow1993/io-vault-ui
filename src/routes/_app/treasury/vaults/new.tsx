import { createFileRoute } from '@tanstack/react-router';

import { PageVaultCreate } from '@/features/vaults/page-vault-form';

export const Route = createFileRoute('/_app/treasury/vaults/new')({
  component: PageVaultCreate,
});
