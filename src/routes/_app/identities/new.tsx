import { createFileRoute } from '@tanstack/react-router';

import { PageIdentityCreate } from '@/features/identities/page-identity-form';

export const Route = createFileRoute('/_app/identities/new')({
  component: PageIdentityCreate,
});
