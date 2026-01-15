import { createFileRoute } from '@tanstack/react-router';

import { PageSigners } from '@/features/signers/page-signers';

export const Route = createFileRoute('/_app/treasury/signers/')({
  component: PageSigners,
});
