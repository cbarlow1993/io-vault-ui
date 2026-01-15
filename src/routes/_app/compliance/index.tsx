import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance/')({
  beforeLoad: () => {
    throw redirect({ to: '/compliance/overview' });
  },
});
