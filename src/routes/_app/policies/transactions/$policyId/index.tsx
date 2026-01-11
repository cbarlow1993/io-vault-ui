import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicyDetail } from '@/features/treasury-6-demo/page-transaction-policy-detail';

export const Route = createFileRoute('/_app/policies/transactions/$policyId/')({
  component: PageTransactionPolicyDetail,
});
