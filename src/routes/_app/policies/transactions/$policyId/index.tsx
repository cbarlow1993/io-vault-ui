import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicyDetail } from '@/features/policies/page-transaction-policy-detail';

export const Route = createFileRoute('/_app/policies/transactions/$policyId/')({
  component: PageTransactionPolicyDetail,
});
