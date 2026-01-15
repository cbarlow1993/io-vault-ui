import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Identities } from '@/features/identities/page-identities';

export const Route = createFileRoute('/_app/compliance/identities/')({
  component: PageTreasury6Identities,
});
