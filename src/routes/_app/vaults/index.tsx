import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Keys } from '@/features/treasury-6-demo/page-keys';

export const Route = createFileRoute('/_app/vaults/')({
  component: PageTreasury6Keys,
});
