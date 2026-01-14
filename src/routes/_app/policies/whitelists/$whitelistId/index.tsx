import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistDetail } from '@/features/policies/page-whitelist-detail';

export const Route = createFileRoute('/_app/policies/whitelists/$whitelistId/')(
  {
    component: PageWhitelistDetail,
  }
);
