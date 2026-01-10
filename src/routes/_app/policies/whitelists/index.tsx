import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelists } from '@/features/treasury-6-demo/page-whitelists';

export const Route = createFileRoute('/_app/policies/whitelists/')({
  component: PageWhitelists,
});
