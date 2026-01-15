import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/treasury/address-book')({
  component: () => <Outlet />,
});
