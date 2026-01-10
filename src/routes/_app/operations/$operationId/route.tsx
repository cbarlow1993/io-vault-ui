import { createFileRoute } from '@tanstack/react-router';

import { PageOperationDetail } from '@/features/treasury-6-demo/page-operation-detail';

export const Route = createFileRoute('/_app/operations/$operationId')({
  component: PageOperationDetail,
});
