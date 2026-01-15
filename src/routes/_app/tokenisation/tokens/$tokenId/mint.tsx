import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { PageTokenMint } from '@/features/tokenisation/page-token-mint';
import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/tokenisation/tokens/$tokenId/mint')(
  {
    component: TokenMintPage,
  }
);

function TokenMintPage() {
  const { tokenId } = Route.useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/tokenisation/tokens/$tokenId', params: { tokenId } });
  };

  return (
    <PageLayout>
      <PageLayoutTopBar title="Mint Tokens" />
      <PageLayoutContent>
        <div className="p-6">
          <PageTokenMint tokenId={tokenId} onBack={handleBack} />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
