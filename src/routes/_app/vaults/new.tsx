import { createFileRoute } from '@tanstack/react-router';

import { PageVaultCreate } from '@/features/treasury-6-demo/page-vault-form';

export const Route = createFileRoute('/_app/vaults/new')({
  component: PageVaultCreate,
});
