import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/global/users')({
  component: GlobalUsersPage,
});

function GlobalUsersPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Users" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage users across your organization.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
