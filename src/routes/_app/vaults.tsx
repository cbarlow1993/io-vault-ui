import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/vaults')({
  beforeLoad: () => {
    throw redirect({
      to: '/treasury/vaults',
    });
  },
});
