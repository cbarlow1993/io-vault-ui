import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/tokenisation/issuances')({
  component: IssuancesPage,
});

function IssuancesPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Issuances" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Issuances</h1>
          <p className="mt-2 text-neutral-600">
            Manage token issuances and minting operations.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
