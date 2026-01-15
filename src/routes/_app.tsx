import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ModuleProvider } from '@/lib/modules';

import { PageError } from '@/components/errors/page-error';

import { GuardAuthenticated } from '@/features/auth/guard-authenticated';
import { Layout } from '@/layout/shell';

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  notFoundComponent: () => <PageError type="404" />,
  errorComponent: () => <PageError type="error-boundary" />,
});

function RouteComponent() {
  return (
    <GuardAuthenticated>
      <ModuleProvider>
        <Layout>
          <Outlet />
        </Layout>
      </ModuleProvider>
    </GuardAuthenticated>
  );
}
