import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityDetail } from '@/features/identities/page-identity-detail';

export const Route = createFileRoute('/_app/identities/$identityId/')({
  component: PageIdentityDetail,
});
