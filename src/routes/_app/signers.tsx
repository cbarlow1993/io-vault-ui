import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/signers')({
  beforeLoad: () => {
    throw redirect({
      to: '/treasury/signers',
    });
  },
});
