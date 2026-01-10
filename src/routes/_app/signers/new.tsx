import { createFileRoute } from '@tanstack/react-router';

import { PageSigners } from '@/features/treasury-6-demo/page-signers';

export const Route = createFileRoute('/_app/signers/new')({
  component: () => <PageSigners initialModalOpen />,
});
