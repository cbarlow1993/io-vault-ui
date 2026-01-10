import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/address-book')({
  component: () => <Outlet />,
});
