import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global/')({
  beforeLoad: () => {
    throw redirect({ to: '/global/users' });
  },
});
