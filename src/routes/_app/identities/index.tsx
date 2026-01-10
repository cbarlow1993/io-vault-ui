import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Identities } from '@/features/treasury-6-demo/page-identities';

export const Route = createFileRoute('/_app/identities/')({
  component: PageTreasury6Identities,
});
