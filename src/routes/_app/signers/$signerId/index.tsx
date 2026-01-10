import { createFileRoute } from '@tanstack/react-router';

import { PageSignerDetail } from '@/features/treasury-6-demo/page-signer-detail';

export const Route = createFileRoute('/_app/signers/$signerId/')({
  component: PageSignerDetail,
});
