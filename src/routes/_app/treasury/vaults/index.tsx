import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Keys } from '@/features/vaults/page-vaults';

export const Route = createFileRoute('/_app/treasury/vaults/')({
  component: PageTreasury6Keys,
});
