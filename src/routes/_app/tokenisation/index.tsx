import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tokenisation/')({
  beforeLoad: () => {
    throw redirect({ to: '/tokenisation/overview' });
  },
});
