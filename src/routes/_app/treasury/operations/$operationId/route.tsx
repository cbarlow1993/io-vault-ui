import { createFileRoute } from '@tanstack/react-router';

import { PageOperationDetail } from '@/features/operations/page-operation-detail';

export const Route = createFileRoute('/_app/treasury/operations/$operationId')({
  component: PageOperationDetail,
});
