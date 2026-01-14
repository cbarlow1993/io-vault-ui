import { createFileRoute } from '@tanstack/react-router';

import { PageWhitelists } from '@/features/policies/page-whitelists';

export const Route = createFileRoute('/_app/policies/whitelists/')({
  component: PageWhitelists,
});
