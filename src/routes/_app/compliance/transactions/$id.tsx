import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceTransactionDetail } from '@/features/compliance/pages/page-transaction-detail';

export const Route = createFileRoute('/_app/compliance/transactions/$id')({
  component: PageComplianceTransactionDetail,
});
