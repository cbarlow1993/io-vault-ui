import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/treasury/vaults')({
  component: () => <Outlet />,
});
