import { createFileRoute } from '@tanstack/react-router';

import { PageReshareDetail } from '@/features/treasury-6-demo/page-reshare-detail';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/reshares/$reshareId'
)({
  component: PageReshareDetail,
});
