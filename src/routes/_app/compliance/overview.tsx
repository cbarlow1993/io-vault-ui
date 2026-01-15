import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/compliance/overview')({
  component: ComplianceOverviewPage,
});

function ComplianceOverviewPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Overview" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Compliance Overview</h1>
          <p className="mt-2 text-neutral-600">
            Welcome to the Compliance module.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
