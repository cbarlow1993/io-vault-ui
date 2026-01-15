import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Dashboard } from '@/features/dashboard/page-dashboard';

export const Route = createFileRoute('/_app/treasury/overview')({
  component: PageTreasury6Dashboard,
});
