import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceTransactions } from '@/features/compliance/pages/page-transactions';

export const Route = createFileRoute('/_app/compliance/transactions/')({
  component: PageComplianceTransactions,
});
