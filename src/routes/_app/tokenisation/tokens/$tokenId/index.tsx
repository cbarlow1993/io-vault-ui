import { createFileRoute } from '@tanstack/react-router';

import { PageTokenDetail } from '@/features/tokenisation/page-token-detail';

export const Route = createFileRoute('/_app/tokenisation/tokens/$tokenId/')({
  component: PageTokenDetail,
});
