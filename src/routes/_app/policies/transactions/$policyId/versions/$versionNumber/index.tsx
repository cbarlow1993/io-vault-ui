import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicyVersionDetail } from '@/features/policies/page-transaction-policy-version-detail';

export const Route = createFileRoute(
  '/_app/policies/transactions/$policyId/versions/$versionNumber/'
)({
  component: PageTransactionPolicyVersionDetail,
});
