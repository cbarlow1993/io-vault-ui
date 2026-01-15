import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/address-book')({
  beforeLoad: () => {
    throw redirect({
      to: '/treasury/address-book',
    });
  },
});
