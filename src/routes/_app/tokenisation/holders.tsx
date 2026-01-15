import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/tokenisation/holders')({
  component: HoldersPage,
});

function HoldersPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Holders" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Holders</h1>
          <p className="mt-2 text-neutral-600">
            View and manage token holders.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
