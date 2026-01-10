import { createFileRoute } from '@tanstack/react-router';

import { PageTreasury6Dashboard } from '@/features/treasury-6-demo/page-dashboard';

export const Route = createFileRoute('/_app/overview')({
  component: PageTreasury6Dashboard,
});
