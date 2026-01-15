import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityDetail } from '@/features/identities/page-identity-detail';

export const Route = createFileRoute(
  '/_app/compliance/identities/$identityId/'
)({
  component: PageIdentityDetail,
});
