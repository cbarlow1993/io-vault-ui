import { createFileRoute } from '@tanstack/react-router';

import { PageTransactionPolicies } from '@/features/policies/page-transaction-policies';

export const Route = createFileRoute('/_app/treasury/policies/transactions/')({
  component: PageTransactionPolicies,
});
