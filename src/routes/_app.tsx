import { createFileRoute, Outlet } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import { GuardAuthenticated } from '@/features/auth/guard-authenticated';
import { Layout } from '@/layout/treasury-6';

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  notFoundComponent: () => <PageError type="404" />,
  errorComponent: () => <PageError type="error-boundary" />,
});

function RouteComponent() {
  return (
    <GuardAuthenticated>
      <Layout>
        <Outlet />
      </Layout>
    </GuardAuthenticated>
  );
}
