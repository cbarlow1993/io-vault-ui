import { createFileRoute } from '@tanstack/react-router';

import { PageTokens } from '@/features/tokenisation/page-tokens';

export const Route = createFileRoute('/_app/tokenisation/tokens/')({
  component: PageTokens,
});
