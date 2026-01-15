import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityEdit } from '@/features/identities/page-identity-form';

export const Route = createFileRoute(
  '/_app/compliance/identities/$identityId/edit'
)({
  component: PageIdentityEdit,
});
