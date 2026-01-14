import { createFileRoute } from '@tanstack/react-router';

import PageLoginVerify from '@/features/auth/page-login-verify';

export const Route = createFileRoute('/login/verify/')({
  component: PageLoginVerify,
});
