import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistDetail } from '@/features/treasury-6-demo/page-whitelist-detail';

export const Route = createFileRoute('/_app/policies/whitelists/$whitelistId/')(
  {
    component: PageWhitelistDetail,
  }
);
