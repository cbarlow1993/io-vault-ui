import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/policies')({
  beforeLoad: () => {
    throw redirect({
      to: '/treasury/policies',
    });
  },
});
