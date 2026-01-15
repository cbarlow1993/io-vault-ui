import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/')({
  beforeLoad: () => {
    // Get last visited module from localStorage
    const lastModule =
      typeof window !== 'undefined' ? localStorage.getItem('lastModule') : null;

    const defaultPaths: Record<string, string> = {
      treasury: '/treasury/overview',
      compliance: '/compliance/overview',
      global: '/global/users',
    };

    const redirectPath =
      lastModule && defaultPaths[lastModule]
        ? defaultPaths[lastModule]
        : '/treasury/overview';

    throw redirect({ to: redirectPath });
  },
});
