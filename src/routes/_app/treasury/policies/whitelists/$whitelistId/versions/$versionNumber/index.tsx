import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistVersionDetail } from '@/features/policies/page-whitelist-version-detail';

export const Route = createFileRoute(
  '/_app/treasury/policies/whitelists/$whitelistId/versions/$versionNumber/'
)({
  component: PageWhitelistVersionDetail,
});
