import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAddressDossier } from '@/features/compliance/pages/page-address-dossier';

export const Route = createFileRoute('/_app/compliance/addresses/$address')({
  component: PageComplianceAddressDossier,
});
