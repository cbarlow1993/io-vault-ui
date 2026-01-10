import { createFileRoute } from '@tanstack/react-router';

import { PageAddressBook } from '@/features/treasury-6-demo/page-address-book';

export const Route = createFileRoute('/_app/address-book/')({
  component: PageAddressBook,
});
