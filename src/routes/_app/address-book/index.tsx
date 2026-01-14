import { createFileRoute } from '@tanstack/react-router';

import { PageAddressBook } from '@/features/address-book/page-address-book';

export const Route = createFileRoute('/_app/address-book/')({
  component: PageAddressBook,
});
