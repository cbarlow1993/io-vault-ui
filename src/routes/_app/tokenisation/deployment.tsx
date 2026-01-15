import { createFileRoute } from '@tanstack/react-router';

import { PageTokenDeployment } from '@/features/tokenisation/page-token-deployment';

export const Route = createFileRoute('/_app/tokenisation/deployment')({
  component: PageTokenDeployment,
});
