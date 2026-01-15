import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Keys } from '@/features/vaults/page-keys';

export const Route = createFileRoute('/_app/treasury/vaults/')({
  component: PageTreasury6Keys,
});
