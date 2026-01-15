import { createFileRoute } from '@tanstack/react-router';

import { PageReshareDetail } from '@/features/operations/page-reshare-detail';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/reshares/$reshareId'
)({
  component: PageReshareDetail,
});
