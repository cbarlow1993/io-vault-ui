import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/tokenisation/overview')({
  component: TokenisationOverviewPage,
});

function TokenisationOverviewPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Overview" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Tokenisation Overview</h1>
          <p className="mt-2 text-neutral-600">
            Welcome to the Tokenisation module.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
