import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicies } from '@/features/treasury-6-demo/page-transaction-policies';

export const Route = createFileRoute('/_app/policies/transactions/')({
  component: PageTransactionPolicies,
});
