import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicyVersionDetail } from '@/features/treasury-6-demo/page-transaction-policy-version-detail';

export const Route = createFileRoute(
  '/_app/policies/transactions/$policyId/versions/$versionNumber/'
)({
  component: PageTransactionPolicyVersionDetail,
});
