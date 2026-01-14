import { createFileRoute } from '@tanstack/react-router';

import PageAccountProfile from '@/features/auth/page-account-profile';

export const Route = createFileRoute('/_app/account/')({
  component: PageAccountProfile,
});
