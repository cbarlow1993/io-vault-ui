import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAddresses } from '@/features/compliance/pages/page-addresses';

export const Route = createFileRoute('/_app/compliance/addresses/')({
  component: PageComplianceAddresses,
});
