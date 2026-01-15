import { createFileRoute } from '@tanstack/react-router';

import PageAccountSecurity from '@/features/auth/page-account-security';

export const Route = createFileRoute('/_app/account/security')({
  component: PageAccountSecurity,
});
