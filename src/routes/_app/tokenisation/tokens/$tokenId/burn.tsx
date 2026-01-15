import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { PageTokenBurn } from '@/features/tokenisation/page-token-burn';
import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/tokenisation/tokens/$tokenId/burn')(
  {
    component: TokenBurnPage,
  }
);

function TokenBurnPage() {
  const { tokenId } = Route.useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/tokenisation/tokens/$tokenId', params: { tokenId } });
  };

  return (
    <PageLayout>
      <PageLayoutTopBar title="Burn Tokens" />
      <PageLayoutContent>
        <div className="p-6">
          <PageTokenBurn tokenId={tokenId} onBack={handleBack} />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
