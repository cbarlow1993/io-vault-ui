import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelistVersionDetail } from '@/features/treasury-6-demo/page-whitelist-version-detail';

export const Route = createFileRoute(
  '/_app/policies/whitelists/$whitelistId/versions/$versionNumber/'
)({
  component: PageWhitelistVersionDetail,
});
