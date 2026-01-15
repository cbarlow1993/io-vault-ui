import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global/organization')({
  beforeLoad: () => {
    throw redirect({
      to: '/global/users',
    });
  },
});
