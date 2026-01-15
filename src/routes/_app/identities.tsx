import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/identities')({
  beforeLoad: () => {
    throw redirect({
      to: '/compliance/identities',
    });
  },
});
