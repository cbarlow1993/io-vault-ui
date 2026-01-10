import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityDetail } from '@/features/treasury-6-demo/page-identity-detail';

export const Route = createFileRoute('/_app/identities/$identityId/')({
  component: PageIdentityDetail,
});
