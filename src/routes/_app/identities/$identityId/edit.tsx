import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityEdit } from '@/features/treasury-6-demo/page-identity-form';

export const Route = createFileRoute('/_app/identities/$identityId/edit')({
  component: PageIdentityEdit,
});
