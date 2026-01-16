import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageVaultDetailTabs } from '@/features/vaults/page-vault-detail-tabs';

const searchSchema = z.object({
  tab: z.enum(['addresses', 'signatures', 'details']).optional(),
});

export const Route = createFileRoute('/_app/treasury/vaults/$vaultId/')({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageVaultDetailTabs initialTab={search.tab} />;
}
